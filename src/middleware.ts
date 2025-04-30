import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

// Liste des chemins publics qui ne nécessitent pas d'authentification
const PUBLIC_PATHS = ['/', '/auth/login', '/auth/confirm', '/auth/error'];

export async function middleware(request: NextRequest) {
  // Mettre à jour la session Supabase
  const response = await updateSession(request);

  // Vérifier si le chemin actuel est un chemin public
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith('/api/'));

  // Vérifier correctement l'authentification en cherchant les cookies Supabase
  const isAuthenticated = Array.from(request.cookies.getAll()).some(
    cookie =>
      cookie.name.includes('access-token') ||
      cookie.name.includes('refresh-token') ||
      cookie.name.includes('auth-token')
  );

  // Rediriger vers la page de connexion si non authentifié et chemin protégé
  if (!isAuthenticated && !isPublicPath) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirect_to', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Rediriger vers le dashboard si déjà authentifié et essaie d'accéder à la page de connexion
  if (isAuthenticated && pathname === '/auth/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

// Configurer les chemins sur lesquels le middleware doit s'exécuter
export const config = {
  matcher: [
    /*
     * Ne pas exécuter le middleware sur les ressources statiques,
     * les fichiers du dossier public, ou les routes API qui ne nécessitent
     * pas d'authentification
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
