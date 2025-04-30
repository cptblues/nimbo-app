import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Erreur d&apos;authentification</CardTitle>
          <CardDescription>
            Une erreur s&apos;est produite lors du processus d&apos;authentification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Cela peut être dû à un lien expiré ou invalide. Veuillez essayer de vous connecter à
            nouveau.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/auth/login">Retour à la page de connexion</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
