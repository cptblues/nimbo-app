import { createClient } from '@/utils/supabase/server';
import { CreateWorkspaceModal } from '@/components/workspace/CreateWorkspaceModal';
import { WorkspaceList } from '@/components/workspace/WorkspaceList';
import { Workspace } from '@/types/models/workspace';

interface MemberWorkspace {
  workspace_id: string;
  role: string;
  workspaces: Workspace;
}

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
        owner_id,
        created_at
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
    ...(ownedWorkspaces || []).map((w: Workspace) => ({ ...w, role: 'owner' })),
    ...(memberWorkspaces || []).map((m: MemberWorkspace) => ({
      ...m.workspaces,
      role: m.role,
    })),
  ];

  // Dédupliquer par ID
  const uniqueWorkspaces = allWorkspaces.filter(
    (w, index, self) => index === self.findIndex(t => t.id === w.id)
  );

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mes espaces de travail</h1>
        <CreateWorkspaceModal triggerText="Créer un espace" />
      </div>

      <WorkspaceList workspaces={uniqueWorkspaces} />
    </div>
  );
}
