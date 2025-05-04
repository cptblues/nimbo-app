/**
 * Types d'événements en temps réel
 */

/**
 * Types d'événements de modification en base de données
 */
export type DatabaseEventType = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Types d'événements système du canal
 */
export type SystemEventType = 'connected' | 'disconnected' | 'error' | 'reconnecting';

/**
 * Types d'événements de présence
 */
export type PresenceEventType = 'sync' | 'join' | 'leave';

/**
 * Statut de connexion au canal temps réel
 */
export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

/**
 * Données de base d'une présence
 */
export interface PresenceData {
  id: string;
  status?: string;
  lastSeen?: string;
  [key: string]: any;
}

/**
 * Charge utile d'un événement de présence
 */
export interface PresencePayload {
  newPresences?: PresenceData[];
  leftPresences?: PresenceData[];
}

/**
 * Événement système émis par le canal
 */
export interface RealtimeSystemEvent {
  event: string;
  detail?: {
    message?: string;
    [key: string]: any;
  };
}

/**
 * Charge utile d'un événement de changement en base de données
 */
export interface RealtimePostgresChangesPayload<T> {
  eventType: DatabaseEventType;
  new: T;
  old: T;
  schema: string;
  table: string;
  commit_timestamp: string;
  errors: any[];
}

/**
 * État de présence stocké par le canal
 */
export interface RealtimePresenceState<T extends Record<string, any> = any> {
  [key: string]: T[];
}
