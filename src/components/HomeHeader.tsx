'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { useEffect, useState } from 'react';

export function HomeHeader() {
  const { user, fetchUserData } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier l'authentification au chargement du composant
    const checkAuth = async () => {
      await fetchUserData();
      setIsLoading(false);
    };

    checkAuth();
  }, [fetchUserData]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">Nimbo</span>
          </Link>
        </div>
        <nav className="flex items-center gap-4">
          {isLoading ? (
            // Afficher un indicateur de chargement si nécessaire
            <span className="text-sm text-muted-foreground">Chargement...</span>
          ) : user ? (
            // Utilisateur connecté
            <>
              <Link href="/dashboard">
                <Button variant="outline">Dashboard</Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Profil</span>
                </Button>
              </Link>
              <form action="/auth/signout" method="post">
                <Button variant="ghost" size="icon" type="submit">
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Déconnexion</span>
                </Button>
              </form>
            </>
          ) : (
            // Utilisateur non connecté
            <Link href="/auth/login">
              <Button>Connexion</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
