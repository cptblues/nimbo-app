'use client';

import { useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { createClient } from '@/utils/supabase/client';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Composant qui initialise et synchronise l'état d'authentification
 * avec Supabase et le userStore
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { fetchUserData } = useUserStore();

  useEffect(() => {
    // Initialiser les données utilisateur au chargement
    fetchUserData();

    // Configurer un listener pour les changements d'authentification
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchUserData();
    });

    // Nettoyer la souscription
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  return <>{children}</>;
}
