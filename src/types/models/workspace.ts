/**
 * Type représentant un espace de travail dans l'application
 */
export interface Workspace {
  id: string;
  created_at: string;
  updated_at?: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  owner_id: string;
}

/**
 * Rôles possibles pour un membre d'un espace de travail
 */
export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

/**
 * Type représentant un membre d'un espace de travail
 */
export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
  updated_at?: string;
  users?: {
    id: string;
    display_name?: string;
    avatar_url?: string;
    email: string;
  };
}
