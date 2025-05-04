import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface WorkspaceUser {
  id: string;
  display_name: string;
  avatar_url?: string;
  status: string;
  status_message?: string;
  current_room?: {
    id: string;
    name: string;
  };
}

interface WorkspaceMember {
  user_id: string;
  users: {
    id: string;
    display_name: string;
    avatar_url?: string;
    status?: string;
    status_message?: string;
  };
}

interface RoomParticipant {
  user_id: string;
  rooms: {
    id: string;
    name: string;
  };
}

interface UserUpdate {
  id: string;
  status?: string;
  status_message?: string;
}

interface RoomParticipantInsert {
  user_id: string;
  room_id: string;
}

interface RoomParticipantDelete {
  user_id: string;
  room_id: string;
}

/**
 * Hook pour gérer la présence des utilisateurs dans un workspace en temps réel
 * @param workspaceId ID du workspace
 * @returns Liste des utilisateurs actifs dans le workspace et leurs statuts
 */
export function useWorkspacePresence(workspaceId: string) {
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger tous les membres du workspace et leur statut de présence
  useEffect(() => {
    if (!workspaceId) return;

    const loadWorkspaceUsers = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();

        // Récupérer tous les membres du workspace
        const { data: members, error: membersError } = await supabase
          .from('workspace_members')
          .select(
            `
            user_id,
            users:user_id (
              id,
              display_name,
              avatar_url,
              status,
              status_message
            )
          `
          )
          .eq('workspace_id', workspaceId);

        if (membersError) throw membersError;

        // Récupérer tous les participants actuels dans les salles du workspace
        const { data: roomParticipants, error: participantsError } = await supabase
          .from('room_participants')
          .select(
            `
            user_id,
            rooms:room_id (
              id,
              name
            )
          `
          )
          .in('room_id', supabase.from('rooms').select('id').eq('workspace_id', workspaceId));

        if (participantsError) throw participantsError;

        // Créer un Map des participants par user_id pour un accès rapide
        const participantsMap = new Map<string, RoomParticipant['rooms']>();
        roomParticipants.forEach((participant: RoomParticipant) => {
          participantsMap.set(participant.user_id, participant.rooms);
        });

        // Combiner les informations pour créer la liste complète des utilisateurs
        const workspaceUsers = members.map((member: WorkspaceMember) => {
          const user = member.users;
          const currentRoom = participantsMap.get(user.id);

          return {
            id: user.id,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            status: user.status || 'offline',
            status_message: user.status_message,
            current_room: currentRoom || undefined,
          };
        });

        setUsers(workspaceUsers);
      } catch (err) {
        setError(`Erreur lors du chargement des utilisateurs: ${(err as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkspaceUsers();

    // Configurer le canal de temps réel pour les mises à jour
    const supabase = createClient();
    const presenceChannel = supabase.channel(`workspace:${workspaceId}`);

    // S'abonner aux changements de statut utilisateur
    presenceChannel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=in.(${supabase.from('workspace_members').select('user_id').eq('workspace_id', workspaceId)})`,
      },
      (payload: RealtimePostgresChangesPayload<UserUpdate>) => {
        // Mettre à jour le statut d'un utilisateur
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === payload.new.id
              ? {
                  ...user,
                  status: payload.new.status || user.status,
                  status_message: payload.new.status_message || user.status_message,
                }
              : user
          )
        );
      }
    );

    // S'abonner aux changements de participants dans les salles
    presenceChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=in.(${supabase.from('rooms').select('id').eq('workspace_id', workspaceId)})`,
        },
        async (payload: RealtimePostgresChangesPayload<RoomParticipantInsert>) => {
          try {
            const userId = payload.new.user_id;

            // Récupérer les informations de la salle
            const { data: roomData, error: roomError } = await supabase
              .from('rooms')
              .select('id, name')
              .eq('id', payload.new.room_id)
              .single();

            if (roomError) throw roomError;

            // Mettre à jour l'utilisateur avec sa nouvelle salle
            setUsers(prevUsers =>
              prevUsers.map(user =>
                user.id === userId ? { ...user, current_room: roomData } : user
              )
            );
          } catch (err) {
            console.error('Erreur lors de la mise à jour de la présence:', err);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=in.(${supabase.from('rooms').select('id').eq('workspace_id', workspaceId)})`,
        },
        (payload: RealtimePostgresChangesPayload<RoomParticipantDelete>) => {
          const userId = payload.old.user_id;

          // Supprimer la salle actuelle de l'utilisateur
          setUsers(prevUsers =>
            prevUsers.map(user =>
              user.id === userId ? { ...user, current_room: undefined } : user
            )
          );
        }
      );

    // Démarrer la souscription
    presenceChannel.subscribe((status: string) => {
      if (status !== 'SUBSCRIBED') {
        setError(`Erreur lors de la souscription au canal: ${status}`);
      }
    });

    // Nettoyage
    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [workspaceId]);

  return {
    users,
    isLoading,
    error,
  };
}
