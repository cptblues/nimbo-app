/**
 * Types pour les API liées aux salles
 */
import { ApiResponse, PaginationParams } from './common';
import { Room, RoomParticipant, ChatMessage, User, RoomType } from '../database.types';

/**
 * Requête de création d'une salle
 *
 * @property name - Nom de la salle
 * @property description - Description de la salle (optionnel)
 * @property type - Type de salle
 * @property capacity - Capacité maximale (optionnel)
 */
export interface ApiRoomCreateRequest {
  name: string;
  description?: string;
  type: RoomType;
  capacity?: number;
}

/**
 * Requête de mise à jour d'une salle
 *
 * @property name - Nouveau nom de la salle (optionnel)
 * @property description - Nouvelle description (optionnel)
 * @property type - Nouveau type (optionnel)
 * @property capacity - Nouvelle capacité maximale (optionnel)
 */
export interface ApiRoomUpdateRequest {
  name?: string;
  description?: string;
  type?: RoomType;
  capacity?: number;
}

/**
 * Requête d'envoi de message dans une salle
 *
 * @property content - Contenu du message
 */
export interface ApiMessageSendRequest {
  content: string;
}

/**
 * Requête de mise à jour des paramètres média d'un participant
 *
 * @property video_enabled - État de la vidéo (optionnel)
 * @property audio_enabled - État du micro (optionnel)
 */
export interface ApiParticipantMediaUpdateRequest {
  video_enabled?: boolean;
  audio_enabled?: boolean;
}

/**
 * Paramètres pour la récupération des messages d'une salle
 *
 * @extends PaginationParams
 * @property before - Récupérer les messages avant cette date (format ISO)
 * @property after - Récupérer les messages après cette date (format ISO)
 */
export interface ApiMessageListParams extends PaginationParams {
  before?: string;
  after?: string;
}

/**
 * Type pour un participant avec les informations utilisateur
 */
export interface RoomParticipantWithUser extends RoomParticipant {
  user: User;
}

/**
 * Type pour un message avec les informations de l'expéditeur
 */
export interface MessageWithUser extends ChatMessage {
  user: User;
}

/**
 * Réponse à la liste des salles d'un workspace
 */
export type ApiRoomListResponse = ApiResponse<{
  rooms: Room[];
}>;

/**
 * Réponse à la récupération d'une salle
 */
export type ApiRoomResponse = ApiResponse<Room>;

/**
 * Réponse à la création d'une salle
 */
export type ApiRoomCreateResponse = ApiResponse<Room>;

/**
 * Réponse à la mise à jour d'une salle
 */
export type ApiRoomUpdateResponse = ApiResponse<Room>;

/**
 * Réponse à la liste des participants d'une salle
 */
export type ApiRoomParticipantListResponse = ApiResponse<{
  participants: RoomParticipantWithUser[];
}>;

/**
 * Réponse à l'ajout d'un participant dans une salle
 */
export type ApiRoomParticipantAddResponse = ApiResponse<RoomParticipantWithUser>;

/**
 * Réponse à la mise à jour des paramètres média d'un participant
 */
export type ApiRoomParticipantUpdateResponse = ApiResponse<RoomParticipantWithUser>;

/**
 * Réponse à la liste des messages d'une salle
 */
export type ApiMessageListResponse = ApiResponse<{
  messages: MessageWithUser[];
  total: number;
}>;

/**
 * Réponse à l'envoi d'un message
 */
export type ApiMessageSendResponse = ApiResponse<MessageWithUser>;

/**
 * Réponse à la suppression d'un message
 */
export type ApiMessageDeleteResponse = ApiResponse<{
  success: boolean;
}>;
