'use client';

import { useState } from 'react';
import { Workspace } from '@/types/database.types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Clock, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import MemberManagement from '@/components/workspace/MemberManagement';
import { useWorkspaceStore } from '@/store/workspaceStore';
interface WorkspaceListProps {
  workspaces: Array<Workspace & { role?: string }>;
}

export function WorkspaceList({ workspaces }: WorkspaceListProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const { setCurrentWorkspace } = useWorkspaceStore();

  const openMemberManagement = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace as Workspace);
    }
  };

  const closeMemberManagement = () => {
    setSelectedWorkspaceId(null);
  };

  if (workspaces.length === 0) {
    return (
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
    );
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {workspaces.map(workspace => {
          const createdAt = workspace.created_at
            ? formatDistanceToNow(new Date(workspace.created_at), {
                addSuffix: true,
                locale: fr,
              })
            : 'récemment';
          const canManageMembers = workspace.role === 'owner' || workspace.role === 'admin';

          return (
            <Card key={workspace.id} className="transition-all hover:shadow-md">
              <CardHeader>
                <CardTitle>{workspace.name}</CardTitle>
                <CardDescription>{workspace.description || 'Aucune description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Rôle: {getRoleName(workspace.role)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    <span>Créé {createdAt}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex space-x-2">
                <Button variant="outline" className="flex-1" asChild>
                  <Link href={`/workspaces/${workspace.id}`}>Accéder</Link>
                </Button>
                {canManageMembers && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openMemberManagement(workspace.id)}
                    title="Gérer les membres"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {selectedWorkspaceId && (
        <MemberManagement
          workspaceId={selectedWorkspaceId}
          isOpen={!!selectedWorkspaceId}
          onClose={closeMemberManagement}
        />
      )}
    </>
  );
}

function getRoleName(role?: string): string {
  if (!role) return 'Membre';

  switch (role) {
    case 'owner':
      return 'Propriétaire';
    case 'admin':
      return 'Administrateur';
    case 'member':
      return 'Membre';
    default:
      return role;
  }
}
