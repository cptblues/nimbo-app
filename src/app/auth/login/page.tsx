'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(`Erreur: ${error.message}`);
      } else {
        setMessage('Connexion réussie!');
        window.location.href = '/';
      }
    } catch (error) {
      setMessage('Une erreur est survenue lors de la connexion');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(`Erreur: ${error.message}`);
      } else {
        setMessage('Vérifiez votre email pour confirmer votre inscription!');
      }
    } catch (error) {
      setMessage('Une erreur est survenue lors de l&apos;inscription');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connexion à Nimbo</CardTitle>
          <CardDescription>
            Connectez-vous à votre compte ou créez-en un nouveau pour accéder à votre espace de
            coworking virtuel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full p-2 border rounded"
              />
            </div>
            {message && (
              <div
                className={`p-2 rounded ${message.includes('Erreur') ? 'bg-red-100' : 'bg-green-100'}`}
              >
                {message}
              </div>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button onClick={handleLogin} disabled={loading} className="w-full">
              {loading ? 'Chargement...' : 'Se connecter'}
            </Button>
            <Button onClick={handleSignUp} disabled={loading} variant="outline" className="w-full">
              S&apos;inscrire
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
