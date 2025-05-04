/**
 * Types communs pour les API
 */

/**
 * Structure d'une réponse d'API réussie
 *
 * @template T - Type des données de réponse
 * @property success - Toujours true pour une réponse réussie
 * @property data - Données retournées par l'API
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Structure d'une erreur d'API
 *
 * @property code - Code d'erreur
 * @property message - Message décrivant l'erreur
 * @property details - Détails optionnels sur l'erreur
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Structure d'une réponse d'API en erreur
 *
 * @property success - Toujours false pour une réponse en erreur
 * @property error - Informations sur l'erreur
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

/**
 * Union des types de réponses possibles
 *
 * @template T - Type des données de réponse
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Paramètres de pagination
 *
 * @property page - Numéro de page (commence à 1)
 * @property limit - Nombre d'éléments par page
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Paramètres de tri
 *
 * @property orderBy - Champ utilisé pour le tri
 * @property order - Direction du tri
 */
export interface SortingParams {
  orderBy?: string;
  order?: 'asc' | 'desc';
}

/**
 * Informations de pagination dans une réponse
 *
 * @property totalItems - Nombre total d'éléments
 * @property totalPages - Nombre total de pages
 * @property currentPage - Page actuelle
 * @property itemsPerPage - Nombre d'éléments par page
 */
export interface PaginationInfo {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}
