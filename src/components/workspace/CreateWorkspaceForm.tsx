'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { ChangeEvent } from 'react';

export function CreateWorkspaceForm({ onCancel }: { onCancel?: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createWorkspace } = useWorkspaceStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Nom requis',
        description: 'Veuillez saisir un nom pour votre espace de travail',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const workspace = await createWorkspace(
        name.trim(),
        description.trim() || undefined,
        logoUrl.trim() || undefined
      );

      if (workspace) {
        toast({
          title: 'Espace créé',
          description: `L'espace de travail ${name} a été créé avec succès`,
        });

        // Rediriger vers le nouveau workspace
        router.push(`/workspaces/${workspace.id}`);
        router.refresh();
      } else {
        throw new Error("Une erreur est survenue lors de la création de l'espace de travail");
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: (error as Error).message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Créer un espace de travail</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nom <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Mon espace de travail"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              maxLength={50}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Décrivez l'objectif de cet espace de travail..."
              value={description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              maxLength={500}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">URL du logo</Label>
            <Input
              id="logoUrl"
              placeholder="https://..."
              value={logoUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLogoUrl(e.target.value)}
              disabled={isSubmitting}
              type="url"
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              "Créer l'espace"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
