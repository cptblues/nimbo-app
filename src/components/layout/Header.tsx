'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold">Nimbo</span>
          </Link>
        </div>

        <div className="md:flex-1"></div>

        <nav className="flex items-center gap-4">
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
        </nav>
      </div>
    </header>
  );
}
