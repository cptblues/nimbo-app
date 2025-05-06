// Déclarations pour les modules internes
declare module '@/utils/supabase/client' {
  import { SupabaseClient } from '@supabase/supabase-js';
  export function createClient(): SupabaseClient;
}

declare module '@/store/userStore' {
  export interface User {
    id: string;
    display_name: string;
    avatar_url?: string;
    status?: string;
    status_message?: string;
  }

  export interface UserState {
    user: User | null;
    authUser: any | null;
    isLoading: boolean;
    error: string | null;
    setUser: (user: User | null) => void;
    setAuthUser: (authUser: any | null) => void;
    updateStatus: (status: string, statusMessage?: string) => Promise<void>;
    updateProfile: (profile: Partial<User>) => Promise<void>;
    logout: () => Promise<void>;
    fetchUserData: () => Promise<void>;
  }

  export function useUserStore(): UserState;
}
