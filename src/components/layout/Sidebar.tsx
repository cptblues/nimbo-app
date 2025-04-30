'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

const mainNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Tableau de bord' },
  { href: '/workspaces', label: 'Espaces de travail' },
  { href: '/profile', label: 'Profil' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  // Détection des appareils mobiles
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Vérification initiale
    checkIfMobile();

    // Mettre à jour lors du redimensionnement
    window.addEventListener('resize', checkIfMobile);

    // Nettoyage
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const NavLinks = () => (
    <ul className="flex flex-col space-y-2 px-2">
      {mainNavItems.map(item => (
        <li key={item.href}>
          <Link
            href={item.href}
            className={`flex items-center rounded-md px-3 py-2 hover:bg-accent hover:text-accent-foreground ${
              pathname === item.href ? 'bg-accent text-accent-foreground' : ''
            }`}
          >
            {item.icon && <span className="mr-2">{item.icon}</span>}
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  // Version mobile (Sheet)
  if (isMobile) {
    return (
      <>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[250px] sm:w-[300px]">
            <div className="px-7 py-4">
              <h2 className="mb-5 text-lg font-medium">Nimbo</h2>
              <NavLinks />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Version desktop
  return (
    <div className="hidden h-screen w-[250px] flex-shrink-0 flex-col border-r bg-background md:flex">
      <div className="px-4 py-6">
        <h2 className="mb-6 px-2 text-lg font-medium">Nimbo</h2>
        <NavLinks />
      </div>
    </div>
  );
}
