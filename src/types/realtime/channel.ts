/**
 * Types liés aux canaux de communication temps réel
 */
import {
  RealtimePostgresChangesPayload,
  PresencePayload,
  RealtimeSystemEvent,
  RealtimePresenceState,
} from './events';

/**
 * Extension du type RealtimeChannel de Supabase
 * pour supporter toutes les fonctionnalités que nous utilisons
 */
export interface RealtimeChannel {
  /**
   * S'abonne aux changements d'une table dans PostgreSQL
   *
   * @param event Identifiant "postgres_changes"
   * @param schema Paramètres de configuration (event, schema, table, filter)
   * @param callback Fonction appelée à chaque événement
   */
  on(
    event: 'postgres_changes',
    schema: {
      event: string;
      schema: string;
      table: string;
      filter?: any;
    },
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ): RealtimeChannel;

  /**
   * S'abonne aux événements de présence
   *
   * @param event Identifiant "presence"
   * @param schema Configuration (event: 'sync' | 'join' | 'leave')
   * @param callback Fonction appelée à chaque événement
   */
  on(
    event: 'presence',
    schema: { event: string },
    callback: (payload: PresencePayload) => void
  ): RealtimeChannel;

  /**
   * S'abonne aux événements système
   *
   * @param event Identifiant "system"
   * @param schema Configuration (event: 'connected' | 'disconnected' | 'error')
   * @param callback Fonction appelée à chaque événement
   */
  on(
    event: 'system',
    schema: { event: string },
    callback: (payload: RealtimeSystemEvent) => void
  ): RealtimeChannel;

  /**
   * Enregistre la présence de l'utilisateur actuel
   *
   * @param presence Données de présence à publier
   */
  track(presence: Record<string, any>): Promise<void>;

  /**
   * Supprime la présence de l'utilisateur actuel
   */
  untrack(): Promise<void>;

  /**
   * Récupère l'état actuel de toutes les présences
   */
  presenceState(): RealtimePresenceState;

  /**
   * S'abonne au canal et retourne un statut
   *
   * @param callback Fonction appelée à chaque changement de statut
   */
  subscribe(callback?: (status: string) => void): RealtimeChannel;
}

/**
 * Options de configuration pour les abonnements temps réel
 */
export interface RealtimeOptions {
  /**
   * Fonction appelée lors d'une reconnexion
   */
  onReconnect?: () => void;

  /**
   * Nombre maximum de tentatives de reconnexion
   */
  maxRetries?: number;

  /**
   * Intervalle entre les tentatives de reconnexion (ms)
   */
  retryInterval?: number;
}

/**
 * Format des noms de canaux pour chaque entité
 */
export const CHANNEL_FORMATS = {
  /**
   * Canal pour un workspace
   *
   * @param workspaceId ID du workspace
   */
  workspace: (workspaceId: string) => `workspace:${workspaceId}`,

  /**
   * Canal pour une salle
   *
   * @param roomId ID de la salle
   */
  room: (roomId: string) => `room:${roomId}`,

  /**
   * Canal pour les participants d'une salle
   *
   * @param roomId ID de la salle
   */
  roomParticipants: (roomId: string) => `room_participants:${roomId}`,

  /**
   * Canal pour les messages d'une salle
   *
   * @param roomId ID de la salle
   */
  roomMessages: (roomId: string) => `room_messages:${roomId}`,

  /**
   * Canal pour la présence
   *
   * @param entityId ID de l'entité (workspace, room, etc.)
   */
  presence: (entityId: string) => `presence:${entityId}`,
};
