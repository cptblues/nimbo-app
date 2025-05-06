import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import { Workspace, WorkspaceMember, MemberRole } from '@/types/database.types';
import { useUserStore } from './userStore';

interface WorkspaceState {
  // Workspace details
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  createWorkspace: (
    name: string,
    description?: string,
    logoUrl?: string
  ) => Promise<Workspace | null>;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;

  // Members actions
  fetchMembers: (workspaceId: string) => Promise<WorkspaceMember[]>;
  addMember: (workspaceId: string, email: string, role?: MemberRole) => Promise<void>;
  updateMemberRole: (workspaceId: string, userId: string, role: MemberRole) => Promise<void>;
  removeMember: (workspaceId: string, userId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(set => ({
  // State
  workspaces: [],
  currentWorkspace: null,
  isLoading: false,
  error: null,

  // Actions
  fetchWorkspaces: async () => {
    const userId = useUserStore.getState().user?.id;
    if (!userId) return;

    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();

      // Récupérer les workspaces dont l'utilisateur est membre
      const { data: memberWorkspaces, error: memberError } = await supabase
        .from('workspace_members')
        .select(
          `
          workspace_id,
          role,
          workspaces (*)
        `
        )
        .eq('user_id', userId);

      if (memberError) throw memberError;

      // Récupérer les workspaces dont l'utilisateur est propriétaire
      const { data: ownedWorkspaces, error: ownerError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', userId);

      if (ownerError) throw ownerError;

      // Fusionner et dédupliquer les workspaces
      const memberWorkspacesData = memberWorkspaces
        ? memberWorkspaces.map((m: { workspaces: unknown }) => m.workspaces as unknown as Workspace)
        : [];

      const allWorkspaces = [...(ownedWorkspaces || []), ...memberWorkspacesData];

      // Dédupliquer par ID
      const uniqueWorkspaces = allWorkspaces.filter(
        (w, index, self) => index === self.findIndex(t => t.id === w.id)
      );

      set({ workspaces: uniqueWorkspaces, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setCurrentWorkspace: workspace => set({ currentWorkspace: workspace }),

  createWorkspace: async (name, description, logoUrl) => {
    const userId = useUserStore.getState().user?.id;
    if (!userId) return null;

    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          name,
          description: description || null,
          logo_url: logoUrl || null,
          owner_id: userId,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Ajouter automatiquement le créateur comme membre avec le rôle admin
      const { error: memberError } = await supabase.from('workspace_members').insert({
        workspace_id: data.id,
        user_id: userId,
        role: 'admin',
      });

      if (memberError) throw memberError;

      set(state => ({
        workspaces: [...state.workspaces, data],
        isLoading: false,
      }));

      return data;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return null;
    }
  },

  updateWorkspace: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();

      const { error, data } = await supabase
        .from('workspaces')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      set(state => ({
        workspaces: state.workspaces.map(w => (w.id === id ? data : w)),
        currentWorkspace: state.currentWorkspace?.id === id ? data : state.currentWorkspace,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteWorkspace: async id => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();

      const { error } = await supabase.from('workspaces').delete().eq('id', id);

      if (error) throw error;

      set(state => ({
        workspaces: state.workspaces.filter(w => w.id !== id),
        currentWorkspace: state.currentWorkspace?.id === id ? null : state.currentWorkspace,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchMembers: async workspaceId => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('workspace_members')
        .select(
          `
          *,
          users (*)
        `
        )
        .eq('workspace_id', workspaceId);

      if (error) throw error;

      set({ isLoading: false });
      return data || [];
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return [];
    }
  },

  addMember: async (workspaceId, email, role = MemberRole.MEMBER) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();

      // Récupérer l'utilisateur par email (peut nécessiter une fonction RPC côté serveur)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error('Utilisateur non trouvé');

      const { error } = await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: userData.id,
        role,
      });

      if (error) throw error;

      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateMemberRole: async (workspaceId, userId, role) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .match({ workspace_id: workspaceId, user_id: userId });

      if (error) throw error;

      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  removeMember: async (workspaceId, userId) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .match({ workspace_id: workspaceId, user_id: userId });

      if (error) throw error;

      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
}));
