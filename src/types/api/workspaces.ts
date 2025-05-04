/**
 * Types pour les API liées aux workspaces
 */
import { ApiResponse } from './common';
import { Workspace, WorkspaceMember, User, MemberRole } from '../database.types';

/**
 * Requête de création d'un workspace
 *
 * @property name - Nom du workspace
 * @property description - Description du workspace (optionnel)
 * @property logo_url - URL du logo (optionnel)
 */
export interface ApiWorkspaceCreateRequest {
  name: string;
  description?: string;
  logo_url?: string;
}

/**
 * Requête de mise à jour d'un workspace
 *
 * @property name - Nouveau nom du workspace (optionnel)
 * @property description - Nouvelle description (optionnel)
 * @property logo_url - Nouvelle URL du logo (optionnel)
 */
export interface ApiWorkspaceUpdateRequest {
  name?: string;
  description?: string;
  logo_url?: string;
}

/**
 * Requête d'ajout d'un membre à un workspace
 *
 * @property user_id - ID de l'utilisateur à ajouter
 * @property role - Rôle à attribuer
 */
export interface ApiWorkspaceMemberAddRequest {
  user_id: string;
  role: MemberRole;
}

/**
 * Requête de mise à jour d'un membre dans un workspace
 *
 * @property role - Nouveau rôle à attribuer
 */
export interface ApiWorkspaceMemberUpdateRequest {
  role: MemberRole;
}

/**
 * Type pour un membre avec les informations utilisateur
 */
export interface WorkspaceMemberWithUser extends WorkspaceMember {
  user: User;
}

/**
 * Réponse à la liste des workspaces
 */
export type ApiWorkspaceListResponse = ApiResponse<{
  workspaces: Workspace[];
}>;

/**
 * Réponse à la récupération d'un workspace
 */
export type ApiWorkspaceResponse = ApiResponse<Workspace>;

/**
 * Réponse à la création d'un workspace
 */
export type ApiWorkspaceCreateResponse = ApiResponse<Workspace>;

/**
 * Réponse à la mise à jour d'un workspace
 */
export type ApiWorkspaceUpdateResponse = ApiResponse<Workspace>;

/**
 * Réponse à la liste des membres d'un workspace
 */
export type ApiWorkspaceMemberListResponse = ApiResponse<{
  members: WorkspaceMemberWithUser[];
}>;

/**
 * Réponse à l'ajout d'un membre dans un workspace
 */
export type ApiWorkspaceMemberAddResponse = ApiResponse<WorkspaceMemberWithUser>;

/**
 * Réponse à la mise à jour d'un membre dans un workspace
 */
export type ApiWorkspaceMemberUpdateResponse = ApiResponse<WorkspaceMemberWithUser>;

/**
 * Réponse à la suppression d'un membre d'un workspace
 */
export type ApiWorkspaceMemberRemoveResponse = ApiResponse<{
  success: boolean;
}>;
