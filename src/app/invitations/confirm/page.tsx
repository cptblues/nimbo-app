'use client';

import { Suspense } from 'react';

export default function ConfirmInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          Chargement...
        </div>
      }
    >
      <InvitationConfirmContent />
    </Suspense>
  );
}

// Composant client qui utilise useSearchParams
function InvitationConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchWorkspaces } = useWorkspaceStore();

  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [message, setMessage] = useState('Traitement de votre invitation en cours...');
  const [workspace, setWorkspace] = useState<{ id: string; name: string } | null>(null);

  const token = searchParams.get('token');
  const action = searchParams.get('action') || 'accept'; // Par défaut, on accepte

  useEffect(() => {
    if (!token) {
      router.push('/dashboard');
      return;
    }

    processInvitation();
  }, [token, router]);

  const processInvitation = async () => {
    try {
      const response = await fetchWithAuth('/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          token,
          action,
        }),
      });

      if (response.success) {
        setStatus('success');

        if (action === 'accept') {
          setWorkspace(response.data.workspace);
          setMessage("Vous avez rejoint l'espace de travail avec succès!");
          // Actualiser la liste des workspaces
          await fetchWorkspaces();
        } else {
          setMessage("Vous avez refusé l'invitation.");
        }
      } else {
        setStatus('error');
        setMessage(
          response.error?.message || "Une erreur est survenue lors du traitement de l'invitation."
        );
      }
    } catch (error) {
      console.error("Erreur lors du traitement de l'invitation:", error);
      setStatus('error');
      setMessage('Une erreur de connexion est survenue. Veuillez réessayer.');
    }
  };

  const goToDashboard = () => {
    router.push('/dashboard');
  };

  const goToWorkspace = () => {
    router.push(`/workspaces/${workspace?.id}`);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {status === 'loading'
              ? 'Traitement en cours'
              : status === 'success'
                ? 'Opération réussie'
                : 'Erreur'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-4 text-center">
            {status === 'loading' ? (
              <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-4" />
            ) : status === 'success' ? (
              action === 'accept' ? (
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              )
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            )}
            <p className="text-center">{message}</p>
            {status === 'success' && action === 'accept' && workspace && (
              <p className="mt-2 text-sm text-gray-500">
                Vous pouvez maintenant accéder à l'espace de travail{' '}
                <strong>{workspace.name}</strong>
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          {status !== 'loading' && (
            <>
              <Button
                onClick={
                  status === 'success' && action === 'accept' && workspace
                    ? goToWorkspace
                    : goToDashboard
                }
                className="w-full"
              >
                {status === 'success' && action === 'accept' && workspace
                  ? "Aller à l'espace de travail"
                  : 'Retour au tableau de bord'}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

// Importer les dépendances pour le composant client
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { fetchWithAuth } from '@/lib/api-client';
