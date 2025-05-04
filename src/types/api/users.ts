/**
 * Types pour les API liées aux utilisateurs
 */
import { PaginationParams, ApiResponse } from './common';
import { User, UserStatus } from '../database.types';

/**
 * Paramètres pour la recherche d'utilisateurs
 *
 * @extends PaginationParams
 * @property query - Terme de recherche (nom, email, etc.)
 * @property excludeIds - IDs d'utilisateurs à exclure
 */
export interface ApiUserSearchParams extends PaginationParams {
  query?: string;
  excludeIds?: string[];
}

/**
 * Requête de mise à jour du statut utilisateur
 *
 * @property status - Nouveau statut
 * @property status_message - Nouveau message de statut (optionnel)
 */
export interface ApiUserStatusUpdateRequest {
  status: UserStatus;
  status_message?: string;
}

/**
 * Requête de mise à jour du profil utilisateur
 *
 * @property display_name - Nouveau nom d'affichage (optionnel)
 * @property avatar_url - Nouvelle URL d'avatar (optionnel)
 */
export interface ApiUserProfileUpdateRequest {
  display_name?: string;
  avatar_url?: string;
}

/**
 * Réponse à la recherche d'utilisateurs
 */
export type ApiUserSearchResponse = ApiResponse<{
  users: User[];
  total: number;
}>;

/**
 * Réponse à la récupération du profil utilisateur actuel
 */
export type ApiUserMeResponse = ApiResponse<User>;

/**
 * Réponse à la mise à jour du profil utilisateur
 */
export type ApiUserProfileUpdateResponse = ApiResponse<User>;

/**
 * Réponse à la mise à jour du statut utilisateur
 */
export type ApiUserStatusUpdateResponse = ApiResponse<{
  status: UserStatus;
  status_message?: string;
}>;
