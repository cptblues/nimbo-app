import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createClient } from '@/utils/supabase/server';

interface PageProps {
  searchParams: Promise<{
    token: string;
  }>;
}

export const metadata: Metadata = {
  title: 'Accepter une invitation - Nimbo',
  description: 'Rejoignez un espace de travail sur Nimbo',
};

// Fonction pour vérifier si un utilisateur est connecté
async function isUserLoggedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

// Fonction pour vérifier la validité d'une invitation
async function verifyInvitation(token: string) {
  console.log('DEBUG - Token à vérifier:', token);
  console.log('DEBUG - Token longueur:', token.length);
  console.log(
    'DEBUG - Token caractères:',
    [...token].map(c => c.charCodeAt(0))
  );

  const url = `http://localhost:3000/api/invitations/verify?token=${token}`;
  console.log('DEBUG - URL complète:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  console.log('DEBUG - Status de la réponse:', response.status);
  const data = await response.json();
  console.log('DEBUG - Données de la réponse:', data);

  return data;
}

// Utilisation de l'interface PageProps pour être compatible avec Next.js 15
export default async function InvitationPage({ searchParams }: PageProps) {
  // Extraction du token depuis searchParams
  const { token } = await searchParams;

  console.log('DEBUG - Token reçu dans la page:', token);

  if (!token) {
    // Au lieu de rediriger, affichons une page de test
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Page de test d'invitation</CardTitle>
            <CardDescription>
              Utilisez les liens ci-dessous pour tester les invitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm mb-2">Liens de test :</h3>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/invitations/accept?token=test-token"
                      className="text-blue-500 hover:underline"
                    >
                      Invitation de test (token=test-token)
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/invitations/accept?token=264da3ca-2980-4054-8681-bedec3357634"
                      className="text-blue-500 hover:underline"
                    >
                      Invitation réelle (token=264da3ca-2980-4054-8681-bedec3357634)
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vérifier l'invitation
  const invitationData = await verifyInvitation(token);
  const isLoggedIn = await isUserLoggedIn();
  console.log('invitationData', invitationData);

  // Si l'invitation n'est pas valide
  if (!invitationData.success) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation invalide</CardTitle>
            <CardDescription>
              {invitationData.error?.message || "Cette invitation n'est pas valide ou a expiré."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-3">
            <Button asChild className="w-full">
              <Link href="/dashboard">Retour au tableau de bord</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/invitations/accept">Page de test des invitations</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const { workspace, invited_email } = invitationData.data;

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitation à rejoindre un workspace</CardTitle>
          <CardDescription>
            Vous avez été invité à rejoindre l'espace de travail{' '}
            <span className="font-medium">{workspace.name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium text-sm">Détails de l'invitation :</h3>
              <ul className="mt-2 space-y-2 text-sm">
                <li>
                  <span className="text-gray-500">Email invité :</span> {invited_email}
                </li>
                <li>
                  <span className="text-gray-500">Espace de travail :</span> {workspace.name}
                </li>
                {workspace.description && (
                  <li>
                    <span className="text-gray-500">Description :</span> {workspace.description}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          {isLoggedIn ? (
            <>
              <p className="text-sm text-gray-500 mb-2">
                Cliquez sur le bouton ci-dessous pour rejoindre cet espace de travail
              </p>
              <div className="flex space-x-3 w-full">
                <Button variant="outline" asChild className="flex-1">
                  <Link href="/dashboard">Refuser</Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link href={`/invitations/confirm?token=${token}`}>Accepter</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-2">
                Vous devez vous connecter pour rejoindre cet espace de travail. Connectez-vous avec
                l'adresse email {invited_email}
              </p>
              <Button asChild className="w-full">
                <Link
                  href={`/auth/login?email=${encodeURIComponent(invited_email)}&redirect=/invitations/accept?token=${token}`}
                >
                  Se connecter
                </Link>
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
