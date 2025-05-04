import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUserStore } from '@/store/userStore';
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  PresencePayload,
} from '@supabase/supabase-js';

type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

interface PresenceUser {
  id: string;
  status: PresenceStatus;
  lastSeen: string;
}

// Type pour les données de présence de Supabase
interface PresenceStateValue {
  presence_ref: string;
  [key: string]: any; // Pour permettre des propriétés personnalisées
}

/**
 * Hook pour gérer la présence des utilisateurs en temps réel
 * @param channelName Nom du canal (généralement 'workspace:${workspaceId}' ou 'room:${roomId}')
 * @param userIds IDs des utilisateurs à surveiller
 * @returns Liste des utilisateurs avec leur statut de présence en temps réel
 */
export function usePresence(channelName: string, userIds: string[] = []) {
  const [presenceUsers, setPresenceUsers] = useState<Map<string, PresenceUser>>(new Map());
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUserStore();

  // Fonction pour mettre à jour le statut de présence de l'utilisateur actuel
  const updateStatus = useCallback(
    async (status: PresenceStatus) => {
      if (!channel || !user) return;

      try {
        await channel.track({
          id: user.id,
          status,
          lastSeen: new Date().toISOString(),
        });
      } catch (err) {
        setError(`Erreur de mise à jour du statut: ${(err as Error).message}`);
      }
    },
    [channel, user]
  );

  // Initialiser le canal et les souscriptions
  useEffect(() => {
    if (!user || !channelName) return;

    const supabase = createClient();

    // S'abonner aux changements de room_participants
    const userFilter = userIds.length > 0 ? { user_id: { in: userIds } } : {};

    // Configuration du canal
    const newChannel = supabase
      .channel(channelName)
      // Cast du canal pour permettre l'utilisation de postgres_changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_participants',
          filter: userFilter,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          handlePresenceChange(payload);
        }
      )
      .on('presence', { event: 'sync' }, () => {
        // Synchronisation des états de présence
        const newState = channel?.presenceState() || {};

        // Convertir l'objet de présence en Map
        const updatedUsers = new Map<string, PresenceUser>();

        // Parcourir les clés de l'état de présence
        Object.keys(newState).forEach(key => {
          const presenceList = newState[key] as PresenceStateValue[];
          if (presenceList && presenceList.length > 0) {
            // Utiliser les données personnalisées si disponibles
            const customData = presenceList[0];
            // Pour éviter les erreurs, vérifier si les propriétés existent
            if ('id' in customData) {
              updatedUsers.set(customData.id as string, {
                id: customData.id as string,
                status: (customData.status as PresenceStatus) || 'online',
                lastSeen: (customData.lastSeen as string) || new Date().toISOString(),
              });
            }
          }
        });

        setPresenceUsers(updatedUsers);
      })
      .on('presence', { event: 'join' }, ({ newPresences }: PresencePayload) => {
        // Un nouvel utilisateur a rejoint
        if (newPresences && newPresences.length > 0) {
          setPresenceUsers(prev => {
            const updated = new Map(prev);
            const presence = newPresences[0];

            // Vérifier si les propriétés nécessaires existent
            if ('id' in presence) {
              updated.set(presence.id as string, {
                id: presence.id as string,
                status: (presence.status as PresenceStatus) || 'online',
                lastSeen: (presence.lastSeen as string) || new Date().toISOString(),
              });
            }

            return updated;
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }: PresencePayload) => {
        // Un utilisateur est parti
        if (leftPresences && leftPresences.length > 0) {
          const leftPresence = leftPresences[0];

          // Vérifier si l'ID existe
          if ('id' in leftPresence) {
            const leftUserId = leftPresence.id as string;

            setPresenceUsers(prev => {
              const updated = new Map(prev);
              // Nous ne supprimons pas l'utilisateur, mais mettons à jour son statut
              if (updated.has(leftUserId)) {
                updated.set(leftUserId, {
                  ...updated.get(leftUserId)!,
                  status: 'offline',
                  lastSeen: new Date().toISOString(),
                });
              }
              return updated;
            });
          }
        }
      });

    // Démarrer le canal
    newChannel.subscribe((status: string) => {
      if (status !== 'SUBSCRIBED') {
        setError(`Erreur de souscription: ${status}`);
        return;
      }

      // Si l'utilisateur est connecté, annoncer sa présence
      if (user) {
        newChannel.track({
          id: user.id,
          status: user.status || 'online',
          lastSeen: new Date().toISOString(),
        });
      }
    });

    setChannel(newChannel);

    // Fonction pour gérer les changements de présence à partir des événements Postgres
    function handlePresenceChange(payload: RealtimePostgresChangesPayload<any>) {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const { user_id, joined_at } = newRecord;

        setPresenceUsers(prev => {
          const updated = new Map(prev);
          // Mettre à jour ou ajouter l'utilisateur
          updated.set(user_id, {
            id: user_id,
            status: 'online',
            lastSeen: joined_at,
          });
          return updated;
        });
      } else if (eventType === 'DELETE') {
        const { user_id } = oldRecord;

        setPresenceUsers(prev => {
          const updated = new Map(prev);
          // Mettre à jour le statut de l'utilisateur qui a quitté
          if (updated.has(user_id)) {
            updated.set(user_id, {
              ...updated.get(user_id)!,
              status: 'offline',
              lastSeen: new Date().toISOString(),
            });
          }
          return updated;
        });
      }
    }

    // Nettoyage lors du démontage du composant
    return () => {
      // Supprimer le statut de présence et se désabonner
      if (newChannel) {
        newChannel.untrack();
        supabase.removeChannel(newChannel);
      }
    };
  }, [channelName, user, userIds]);

  // Convertir la Map en tableau pour faciliter l'utilisation
  const presenceArray = Array.from(presenceUsers.values());

  return {
    presenceUsers: presenceArray,
    updateStatus,
    error,
  };
}
