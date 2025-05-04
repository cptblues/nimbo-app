// Déclarations pour les modules internes
declare module '@/utils/supabase/client' {
  import { SupabaseClient } from '@supabase/supabase-js';
  export function createClient(): SupabaseClient;
}

// Extension des types Supabase pour Realtime
declare module '@supabase/supabase-js' {
  export interface RealtimePostgresChangesPayload<T> {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: T;
    old: T;
    schema: string;
    table: string;
    commit_timestamp: string;
    errors: any[];
  }

  interface RealtimePresenceState<T extends Record<string, any> = any> {
    [key: string]: T[];
  }

  export interface PresenceData {
    id: string;
    status?: string;
    lastSeen?: string;
    [key: string]: any;
  }

  export interface PresencePayload {
    newPresences?: PresenceData[];
    leftPresences?: PresenceData[];
  }

  export interface RealtimeSystemEvent {
    event: string;
    detail?: {
      message?: string;
      [key: string]: any;
    };
  }

  interface RealtimeChannel {
    on(
      event: 'postgres_changes',
      schema: { event: string; schema: string; table: string; filter?: any },
      callback: (payload: RealtimePostgresChangesPayload<any>) => void
    ): RealtimeChannel;

    on(
      event: 'presence',
      schema: { event: string },
      callback: (payload: PresencePayload) => void
    ): RealtimeChannel;

    on(
      event: 'system',
      schema: { event: string },
      callback: (payload: RealtimeSystemEvent) => void
    ): RealtimeChannel;

    track(presence: Record<string, any>): Promise<void>;
    untrack(): Promise<void>;
    presenceState(): RealtimePresenceState;
    subscribe(callback?: (status: string) => void): RealtimeChannel;
  }
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
