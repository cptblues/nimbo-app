'use client';

import { Workspace } from '@/types/models/workspace';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

interface WorkspaceListProps {
  workspaces: Array<Workspace & { role?: string }>;
}

export function WorkspaceList({ workspaces }: WorkspaceListProps) {
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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {workspaces.map(workspace => {
        const createdAt = workspace.created_at
          ? formatDistanceToNow(new Date(workspace.created_at), {
              addSuffix: true,
              locale: fr,
            })
          : 'récemment';

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
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/workspaces/${workspace.id}`}>Accéder</Link>
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
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
