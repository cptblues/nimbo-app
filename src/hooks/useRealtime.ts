import { useState, useEffect, useCallback } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useRealtimeStatus } from './useRealtimeStatus';

interface RealtimeSubscriptionOptions<T extends Record<string, any>> {
  table: string;
  schema?: string;
  filter?: string;
  onInsert?: (record: T) => void;
  onUpdate?: (newRecord: T, oldRecord: T) => void;
  onDelete?: (oldRecord: T) => void;
  onAll?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

/**
 * Hook générique pour s'abonner aux changements Realtime de Supabase
 * @param channelName Nom unique du canal
 * @param options Options de configuration des abonnements
 * @returns État de la connexion et méthodes de contrôle
 */
export function useRealtime<T extends Record<string, any>>(
  channelName: string,
  options: RealtimeSubscriptionOptions<T>
) {
  const [isListening, setIsListening] = useState(false);

  // Utiliser useRealtimeStatus pour gérer l'état de la connexion
  const {
    status,
    error: connectionError,
    connected,
    reset,
    channel,
  } = useRealtimeStatus(channelName, {
    onReconnect: () => {
      // Réabonnement automatique en cas de reconnexion
      if (isListening) {
        startListening();
      }
    },
  });

  // Fonction pour traiter les événements Postgres
  const handlePostgresChanges = useCallback(
    (payload: RealtimePostgresChangesPayload<T>) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      // S'il y a un handler générique, l'appeler d'abord
      if (options.onAll) {
        options.onAll(payload);
      }

      // Puis appeler les handlers spécifiques par type d'événement
      if (eventType === 'INSERT' && options.onInsert && newRecord) {
        options.onInsert(newRecord as T);
      } else if (eventType === 'UPDATE' && options.onUpdate && newRecord && oldRecord) {
        options.onUpdate(newRecord as T, oldRecord as T);
      } else if (eventType === 'DELETE' && options.onDelete && oldRecord) {
        options.onDelete(oldRecord as T);
      }
    },
    [options]
  );

  // Fonction pour démarrer l'écoute des changements
  const startListening = useCallback(() => {
    if (!channel || isListening) return;

    const { table, schema = 'public', filter } = options;

    // S'abonner aux insertions
    if (options.onInsert || options.onAll) {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema,
          table,
          filter,
        },
        handlePostgresChanges
      );
    }

    // S'abonner aux mises à jour
    if (options.onUpdate || options.onAll) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema,
          table,
          filter,
        },
        handlePostgresChanges
      );
    }

    // S'abonner aux suppressions
    if (options.onDelete || options.onAll) {
      channel.on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema,
          table,
          filter,
        },
        handlePostgresChanges
      );
    }

    setIsListening(true);
  }, [channel, handlePostgresChanges, isListening, options]);

  // Fonction pour arrêter l'écoute des changements
  const stopListening = useCallback(() => {
    if (!channel || !isListening) return;

    // Puisque Supabase v2 n'a pas de méthode off simple,
    // nous devons simplement réinitialiser le canal
    reset();

    setIsListening(false);
  }, [channel, isListening, reset]);

  // Démarrer l'écoute au montage et quand le canal est prêt
  useEffect(() => {
    if (connected && !isListening) {
      startListening();
    }

    // Nettoyage lors du démontage du composant
    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, [connected, isListening, startListening, stopListening]);

  return {
    status,
    isListening,
    error: connectionError,
    startListening,
    stopListening,
    reset,
  };
}
