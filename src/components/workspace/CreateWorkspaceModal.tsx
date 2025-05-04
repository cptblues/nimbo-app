'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { CreateWorkspaceForm } from './CreateWorkspaceForm';
import { useState } from 'react';

interface CreateWorkspaceModalProps {
  triggerText?: string;
}

export function CreateWorkspaceModal({
  triggerText = 'Créer un espace',
}: CreateWorkspaceModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un nouvel espace de travail</DialogTitle>
          <DialogDescription>
            Les espaces de travail vous permettent de collaborer avec votre équipe.
          </DialogDescription>
        </DialogHeader>
        <CreateWorkspaceForm onCancel={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
