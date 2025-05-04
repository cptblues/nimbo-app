import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { RealtimeChannel, RealtimeSystemEvent } from '@supabase/supabase-js';

type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

interface RealtimeStatusOptions {
  onReconnect?: () => void;
  maxRetries?: number;
  retryInterval?: number;
}

/**
 * Hook pour suivre le statut de connexion Realtime et gérer la reconnexion automatique
 * @param channelName Nom du canal à surveiller
 * @param options Options de configuration pour la reconnexion
 * @returns État actuel de la connexion et fonctions pour gérer les canaux
 */
export function useRealtimeStatus(channelName: string, options: RealtimeStatusOptions = {}) {
  const {
    onReconnect,
    maxRetries = 5,
    retryInterval = 3000, // 3 secondes par défaut
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('CONNECTING');
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fonction pour établir une connexion au canal
  const connect = useCallback(() => {
    try {
      const supabase = createClient();

      // Nettoyage du canal précédent si nécessaire
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      setStatus('CONNECTING');
      setError(null);

      // Création d'un nouveau canal
      const channel = supabase.channel(channelName);

      // Configuration des gestionnaires d'événements
      channel
        .on('system', { event: 'connected' }, () => {
          setStatus('CONNECTED');
          retryCountRef.current = 0;
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
          }
        })
        .on('system', { event: 'disconnected' }, () => {
          setStatus('DISCONNECTED');
          // Tenter de se reconnecter
          initiateReconnect();
        })
        .on('system', { event: 'error' }, (event: RealtimeSystemEvent) => {
          setError(`Erreur Realtime: ${event.detail?.message || 'Erreur inconnue'}`);
          setStatus('DISCONNECTED');
          // Tenter de se reconnecter
          initiateReconnect();
        });

      // S'abonner au canal
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setStatus('CONNECTED');
          retryCountRef.current = 0;
        } else if (status === 'CHANNEL_ERROR') {
          setStatus('DISCONNECTED');
          setError(`Erreur de canal: ${status}`);
          initiateReconnect();
        } else if (status === 'TIMED_OUT') {
          setStatus('DISCONNECTED');
          setError('Connexion expirée');
          initiateReconnect();
        }
      });

      channelRef.current = channel;
    } catch (err) {
      setError(`Erreur lors de l'initialisation du canal: ${(err as Error).message}`);
      setStatus('DISCONNECTED');
      initiateReconnect();
    }
  }, [channelName]);

  // Fonction pour initier une reconnexion
  const initiateReconnect = useCallback(() => {
    if (retryCountRef.current >= maxRetries) {
      setError(`Nombre maximum de tentatives de reconnexion atteint (${maxRetries})`);
      return;
    }

    // Incrémenter le compteur de tentatives
    retryCountRef.current += 1;

    // Mettre à jour le statut
    setStatus('RECONNECTING');

    // Planifier une tentative de reconnexion
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      // Tenter de se reconnecter
      connect();

      // Déclencher le callback onReconnect si fourni
      if (onReconnect) {
        onReconnect();
      }
    }, retryInterval);
  }, [connect, maxRetries, onReconnect, retryInterval]);

  // Fonction pour se déconnecter manuellement
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      setStatus('DISCONNECTED');
    }
  }, []);

  // Initialiser la connexion au montage
  useEffect(() => {
    connect();

    // Nettoyage à la destruction du composant
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Fonction pour réinitialiser manuellement la connexion
  const reset = useCallback(() => {
    disconnect();
    retryCountRef.current = 0;
    connect();
  }, [connect, disconnect]);

  return {
    status,
    error,
    connected: status === 'CONNECTED',
    connecting: status === 'CONNECTING' || status === 'RECONNECTING',
    disconnect,
    reset,
    channel: channelRef.current,
  };
}
