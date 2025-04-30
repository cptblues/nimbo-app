import { createClient } from '@/utils/supabase/server';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus } from 'lucide-react';

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Récupérer les workspaces dont l'utilisateur est membre
  const { data: memberWorkspaces } = await supabase
    .from('workspace_members')
    .select(
      `
      workspace_id,
      role,
      workspaces (
        id,
        name,
        description,
        logo_url,
        owner_id
      )
    `
    )
    .eq('user_id', user?.id);

  // Récupérer les workspaces créés par l'utilisateur
  const { data: ownedWorkspaces } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user?.id);

  // Fusionner et dédupliquer les workspaces
  const allWorkspaces = [
    ...(ownedWorkspaces || []).map(w => ({ ...w, role: 'owner' })),
    ...(memberWorkspaces || []).map(m => ({
      ...m.workspaces,
      role: m.role,
    })),
  ];

  // Dédupliquer par ID
  const uniqueWorkspaces = allWorkspaces.filter(
    (w, index, self) => index === self.findIndex(t => t.id === w.id)
  );

  return (
    <div className="container mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mes espaces de travail</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Créer un espace
        </Button>
      </div>

      {uniqueWorkspaces.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aucun espace de travail</CardTitle>
            <CardDescription>
              Vous n&apos;avez pas encore créé ou rejoint d&apos;espace de travail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Créez votre premier espace de travail pour commencer à collaborer.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {uniqueWorkspaces.map(workspace => (
            <Card key={workspace.id}>
              <CardHeader>
                <CardTitle>{workspace.name}</CardTitle>
                <CardDescription>{workspace.description || 'Aucune description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Rôle: {workspace.role === 'owner' ? 'Propriétaire' : workspace.role}
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <a href={`/workspaces/${workspace.id}`}>Accéder</a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
