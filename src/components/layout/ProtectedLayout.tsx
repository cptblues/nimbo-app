import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { MainLayout } from './MainLayout';

interface ProtectedLayoutProps {
  children: ReactNode;
}

export async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const supabase = await createClient();

  // Vérifier si l'utilisateur est authentifié
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rediriger vers la page de connexion si non authentifié
  if (!user) {
    redirect('/auth/login');
  }

  return <MainLayout>{children}</MainLayout>;
}
