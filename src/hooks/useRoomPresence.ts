import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUserStore } from '@/store/userStore';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface RoomParticipant {
  id: string;
  user_id: string;
  room_id: string;
  joined_at: string;
  video_enabled: boolean;
  audio_enabled: boolean;
  user?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    status?: string;
    status_message?: string;
  };
}

// Interface pour les données brutes de Supabase avant formatage
interface RawParticipant {
  id: string;
  user_id: string;
  room_id: string;
  joined_at: string;
  video_enabled: boolean;
  audio_enabled: boolean;
  users: {
    id: string;
    display_name: string;
    avatar_url?: string;
    status?: string;
    status_message?: string;
  };
}

/**
 * Hook pour gérer la présence des utilisateurs dans une salle en temps réel
 * @param roomId ID de la salle
 * @returns Les participants de la salle en temps réel et des fonctions pour interagir
 */
export function useRoomPresence(roomId: string) {
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUserStore();

  // Chargement initial des participants
  useEffect(() => {
    if (!roomId) return;

    const loadParticipants = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('room_participants')
          .select(
            `
            *,
            users:user_id (
              id,
              display_name,
              avatar_url,
              status,
              status_message
            )
          `
          )
          .eq('room_id', roomId);

        if (fetchError) throw fetchError;

        // Transformer les données pour les adapter à notre structure
        const formattedParticipants = data.map((participant: RawParticipant) => ({
          ...participant,
          user: participant.users,
        }));

        setParticipants(formattedParticipants);
      } catch (err) {
        setError(`Erreur lors du chargement des participants: ${(err as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadParticipants();
  }, [roomId]);

  // Configuration du temps réel pour suivre les changements de participants
  useEffect(() => {
    if (!roomId) return;

    const supabase = createClient();

    // Créer un canal pour cette salle spécifique
    const roomChannel = supabase.channel(`room:${roomId}`);

    // S'abonner aux changements dans la table room_participants pour cette salle
    roomChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload: RealtimePostgresChangesPayload<RoomParticipant>) => {
          // Un nouveau participant a rejoint la salle
          try {
            const supabase = createClient();
            const { data, error: fetchError } = await supabase
              .from('room_participants')
              .select(
                `
                *,
                users:user_id (
                  id,
                  display_name,
                  avatar_url,
                  status,
                  status_message
                )
              `
              )
              .eq('id', (payload.new as RoomParticipant & { id: string }).id)
              .single();

            if (fetchError) throw fetchError;

            // Ajouter le nouveau participant à notre état
            const formattedParticipant = {
              ...data,
              user: data.users,
            };

            setParticipants(prevParticipants => [...prevParticipants, formattedParticipant]);
          } catch (err) {
            setError(
              `Erreur lors de la récupération du nouveau participant: ${(err as Error).message}`
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<RoomParticipant>) => {
          // Un participant a mis à jour son statut
          setParticipants(prevParticipants =>
            prevParticipants.map(participant =>
              participant.id === (payload.new as RoomParticipant & { id: string }).id
                ? { ...participant, ...payload.new }
                : participant
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<RoomParticipant>) => {
          // Un participant a quitté la salle
          setParticipants(prevParticipants =>
            prevParticipants.filter(
              participant =>
                participant.id !== (payload.old as Partial<RoomParticipant> & { id: string }).id
            )
          );
        }
      );

    // Démarrer la souscription
    roomChannel.subscribe((status: string) => {
      if (status !== 'SUBSCRIBED') {
        setError(`Erreur lors de la souscription au canal: ${status}`);
      }
    });

    // Nettoyage lors du démontage
    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomId]);

  // Fonction pour rejoindre la salle
  const joinRoom = useCallback(async () => {
    if (!user || !roomId) return;

    try {
      const supabase = createClient();

      // D'abord, vérifier si l'utilisateur est déjà dans une autre salle de ce workspace
      // Nous devons d'abord récupérer le workspace_id de cette salle
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('workspace_id')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;

      // Récupérer les IDs des salles du même workspace
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('id')
        .eq('workspace_id', roomData.workspace_id);

      if (roomsError) throw roomsError;

      const roomIds = roomsData.map((room: any) => room.id);

      // Quitter toutes les autres salles du même workspace
      if (roomIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('room_participants')
          .delete()
          .eq('user_id', user.id)
          .in('room_id', roomIds);

        if (deleteError) throw deleteError;
      }

      // Rejoindre la nouvelle salle
      const { error: insertError } = await supabase.from('room_participants').insert({
        room_id: roomId,
        user_id: user.id,
        joined_at: new Date().toISOString(),
        video_enabled: true,
        audio_enabled: true,
      });

      if (insertError) throw insertError;
    } catch (err) {
      setError(`Erreur lors de l'entrée dans la salle: ${(err as Error).message}`);
      return false;
    }

    return true;
  }, [user, roomId]);

  // Fonction pour quitter la salle
  const leaveRoom = useCallback(async () => {
    if (!user || !roomId) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('room_participants')
        .delete()
        .eq('user_id', user.id)
        .eq('room_id', roomId);

      if (error) throw error;
    } catch (err) {
      setError(`Erreur lors de la sortie de la salle: ${(err as Error).message}`);
      return false;
    }

    return true;
  }, [user, roomId]);

  // Fonction pour mettre à jour l'état audio/vidéo
  const updateMediaState = useCallback(
    async (videoEnabled?: boolean, audioEnabled?: boolean) => {
      if (!user || !roomId) return;

      const updates: Record<string, any> = {};
      if (videoEnabled !== undefined) updates.video_enabled = videoEnabled;
      if (audioEnabled !== undefined) updates.audio_enabled = audioEnabled;

      // Si aucune mise à jour n'est fournie, ne rien faire
      if (Object.keys(updates).length === 0) return;

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from('room_participants')
          .update(updates)
          .eq('user_id', user.id)
          .eq('room_id', roomId);

        if (error) throw error;
      } catch (err) {
        setError(`Erreur lors de la mise à jour des paramètres média: ${(err as Error).message}`);
        return false;
      }

      return true;
    },
    [user, roomId]
  );

  // Obtenir le participant actuel (l'utilisateur connecté)
  const currentParticipant = participants.find(participant => participant.user_id === user?.id);

  return {
    participants,
    currentParticipant,
    isLoading,
    error,
    joinRoom,
    leaveRoom,
    updateMediaState,
  };
}
