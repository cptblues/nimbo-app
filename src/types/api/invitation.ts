export interface Workspace {
  id: number;
  name: string;
  description: string | null;
  logo_url: string | null;
}

export interface Invitation {
  id: number;
  workspace_id: number;
  invited_email: string;
  role: string;
  status: string;
  expires_at: string;
  workspaces: Workspace; // Un seul objet, pas un tableau
}
