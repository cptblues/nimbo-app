/**
 * Types partagés utilisés dans toute l'application
 */

/**
 * Interface pour les objets avec un ID
 */
export interface WithId {
  id: string;
}

/**
 * Interface pour les objets avec un timestamp de création et de mise à jour
 */
export interface WithTimestamps {
  created_at: string;
  updated_at: string;
}

/**
 * Interface pour les objets qui peuvent être affichés dans l'UI
 */
export interface Displayable {
  name: string;
  description?: string;
}

/**
 * Représente un statut de l'application
 */
export interface AppStatus {
  /**
   * Code du statut
   */
  code: string;

  /**
   * Message associé au statut
   */
  message: string;

  /**
   * Type de statut (succès, erreur, avertissement, info)
   */
  type: 'success' | 'error' | 'warning' | 'info';

  /**
   * Date de création du statut
   */
  timestamp: string;
}

/**
 * Résultat générique d'une opération
 *
 * @template T - Type du résultat
 */
export interface OperationResult<T = void> {
  /**
   * Succès de l'opération
   */
  success: boolean;

  /**
   * Données résultantes (si succès)
   */
  data?: T;

  /**
   * Message d'erreur (si échec)
   */
  error?: string;
}

/**
 * Types d'alertes pour les notifications
 */
export type AlertType = 'success' | 'info' | 'warning' | 'error';

/**
 * Configuration pour une notification
 */
export interface NotificationConfig {
  /**
   * Type de notification
   */
  type: AlertType;

  /**
   * Titre de la notification
   */
  title: string;

  /**
   * Message de la notification
   */
  message: string;

  /**
   * Durée d'affichage en ms (0 = sans limite)
   */
  duration?: number;
}
