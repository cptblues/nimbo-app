import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ApiErrorCodes, apiError } from './api-utils';

// Type pour une fonction de route API avec authentification
export type AuthenticatedRouteHandler = (
  req: NextRequest,
  context: { params: Record<string, string | string[]> },
  user: any
) => Promise<NextResponse>;

// Middleware d'authentification pour les routes API
export function withAuth(handler: AuthenticatedRouteHandler) {
  return async (req: NextRequest, context: { params: Record<string, string | string[]> }) => {
    // Initialiser Supabase
    const supabase = await createClient();

    // Vérifier si l'utilisateur est authentifié
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Si pas d'utilisateur authentifié, renvoyer une erreur 401
    if (error || !user) {
      return apiError(
        'Vous devez être connecté pour accéder à cette ressource',
        ApiErrorCodes.UNAUTHORIZED,
        401
      );
    }

    // Si l'utilisateur est authentifié, exécuter le handler de route
    return handler(req, context, user);
  };
}

// Fonction pour obtenir l'utilisateur complet depuis la base de données
export async function getFullUser(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

  if (error) {
    throw error;
  }

  return data;
}
