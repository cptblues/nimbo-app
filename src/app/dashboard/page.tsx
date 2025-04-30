import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: userData } = await supabase.from('users').select('*').eq('id', user?.id).single();

  return (
    <div className="container mx-auto">
      <h1 className="mb-6 text-3xl font-bold">Tableau de bord</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Bienvenue, {userData?.display_name || user?.email}</CardTitle>
            <CardDescription>Voici votre espace de travail virtuel</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Commencez par rejoindre ou créer un espace de travail.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Espaces actifs</CardTitle>
            <CardDescription>Vos espaces de travail récents</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Vous n&apos;avez pas encore rejoint d&apos;espace de travail.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statut</CardTitle>
            <CardDescription>Votre disponibilité actuelle</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Vous êtes actuellement {userData?.status || 'hors ligne'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
