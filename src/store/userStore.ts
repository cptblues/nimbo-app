import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { User, UserStatus } from '@/types/database.types';
import { createClient } from '@/utils/supabase/client';

interface UserState {
  // User details
  user: User | null;
  authUser: any | null; // Supabase auth user
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setAuthUser: (authUser: any | null) => void;
  updateStatus: (status: UserStatus, statusMessage?: string) => Promise<void>;
  updateProfile: (profile: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  fetchUserData: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      authUser: null,
      isLoading: false,
      error: null,

      // Actions
      setUser: user => set({ user }),
      setAuthUser: authUser => set({ authUser }),

      updateStatus: async (status, statusMessage) => {
        const { user } = get();
        if (!user) return;

        set({ isLoading: true, error: null });
        try {
          const supabase = createClient();
          const { error } = await supabase
            .from('users')
            .update({
              status,
              ...(statusMessage !== undefined && { status_message: statusMessage }),
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          if (error) throw error;

          set(state => ({
            user: {
              ...state.user!,
              status,
              ...(statusMessage !== undefined && { status_message: statusMessage }),
              updated_at: new Date().toISOString(),
            },
            isLoading: false,
          }));
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      updateProfile: async profile => {
        const { user } = get();
        if (!user) return;

        set({ isLoading: true, error: null });
        try {
          const supabase = createClient();
          const { error, data } = await supabase
            .from('users')
            .update({
              ...profile,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)
            .select('*')
            .single();

          if (error) throw error;

          set({ user: data, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
          set({ user: null, authUser: null, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      fetchUserData: async () => {
        set({ isLoading: true, error: null });
        try {
          const supabase = createClient();
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();

          if (!authUser) {
            set({ user: null, authUser: null, isLoading: false });
            return;
          }

          set({ authUser });

          // Tenter de récupérer l'utilisateur
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          if (!userData) {
            // L'utilisateur n'existe pas dans la table users
            // Ceci est probablement dû à un problème avec le trigger Supabase
            // qui devrait créer automatiquement un utilisateur
            set({
              error:
                "Votre profil utilisateur n'a pas été trouvé. Déconnectez-vous et reconnectez-vous pour résoudre ce problème.",
              isLoading: false,
            });
            return;
          }

          set({ user: userData, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },
    }),
    {
      name: 'nimbo-user-storage',
      storage: createJSONStorage(() => localStorage), // Utiliser localStorage pour la persistance entre sessions
      partialize: state => ({
        user: state.user,
        authUser: state.authUser,
      }),
    }
  )
);
