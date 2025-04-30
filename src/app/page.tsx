import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center w-full max-w-3xl">
        <h1 className="text-4xl font-bold text-center">Nimbo Coworking Virtuel</h1>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Bienvenue sur Nimbo</CardTitle>
            <CardDescription>
              L&apos;espace de coworking virtuel qui reproduit l&apos;expérience sociale d&apos;un
              espace physique
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Ce projet est en cours de développement. Nous mettons en place l&apos;intégration avec
              Supabase pour l&apos;authentification et la base de données.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold">Étape 1.1 ✅</h3>
                <p className="text-sm">Initialisation du projet</p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold">Étape 1.2 ✅</h3>
                <p className="text-sm">Configuration UI</p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold">Étape 1.3 ⏳</h3>
                <p className="text-sm">Mise en place Supabase</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/auth/login">Se connecter</Link>
            </Button>
            <Button asChild>
              <Link href="/profile">Mon profil</Link>
            </Button>
          </CardFooter>
        </Card>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Button asChild className="gap-2">
            <a href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer">
              <Image src="/vercel.svg" alt="Vercel logomark" width={20} height={20} />
              shadcn/ui
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
              Supabase
            </a>
          </Button>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Nimbo Coworking Virtuel - Étape 1.3: Mise en place Supabase (En cours)
        </p>
      </footer>
    </div>
  );
}
