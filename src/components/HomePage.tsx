'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HomeHeader } from '@/components/HomeHeader';

export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <HomeHeader />

      <main className="flex-1">
        {/* Section héro */}
        <section className="px-4 py-20 md:py-32">
          <div className="grid gap-6 md:grid-cols-2 md:gap-12">
            <div className="flex flex-col justify-center space-y-4">
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                Espace de coworking virtuel
              </h1>
              <p className="text-xl text-muted-foreground">
                Collaborez en temps réel avec votre équipe, peu importe où vous vous trouvez.
              </p>
              <div className="flex flex-col gap-2 pt-4 sm:flex-row">
                <Link href="/auth/login">
                  <Button size="lg">Commencer gratuitement</Button>
                </Link>
              </div>
            </div>
            <div className="hidden md:block">
              {/* Placeholder pour illustration */}
              <div className="flex h-full items-center justify-center rounded-lg bg-muted p-8">
                <div className="text-center text-muted-foreground">
                  Illustration de la plateforme
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section fonctionnalités */}
        <section className="px-4 py-16">
          <h2 className="mb-10 text-center text-3xl font-bold">Fonctionnalités principales</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Vidéoconférence fluide</CardTitle>
                <CardDescription>Communication en temps réel</CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  Rejoignez facilement des salles de réunion virtuelles avec une visioconférence
                  haute qualité.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Espaces de travail collaboratifs</CardTitle>
                <CardDescription>Organisation par équipe</CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  Créez des espaces dédiés pour vos équipes et vos projets avec différents types de
                  salles.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Présence en temps réel</CardTitle>
                <CardDescription>Statuts et disponibilités</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Visualisez quels membres sont en ligne, occupés ou disponibles pour échanger.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t bg-background py-6">
        <div className="px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-center text-sm text-muted-foreground md:text-left">
              &copy; 2024 Nimbo. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
