import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Mail, Check, X, User, ShieldAlert, Shield } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useUserStore } from '@/store/userStore';
import { fetchWithAuth } from '@/lib/api-client';
import Image from 'next/image';

export type WorkspaceMember = {
  id: string | null;
  user_id: string;
  role: string;
  workspace_id: string;
  users: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    email: string;
  };
};

export type WorkspaceInvitation = {
  id: string;
  workspace_id: string;
  invited_email: string;
  invited_by: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  users: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    email: string;
  };
};

type MemberManagementProps = {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function MemberManagement({ workspaceId, isOpen, onClose }: MemberManagementProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);
  const { user } = useUserStore();
  const { currentWorkspace } = useWorkspaceStore();

  // Charger les membres et invitations
  useEffect(() => {
    if (isOpen && workspaceId) {
      loadMembers();
      loadInvitations();
    }
  }, [isOpen, workspaceId]);

  const loadMembers = async () => {
    try {
      const response = await fetchWithAuth(`/api/workspaces/${workspaceId}/members`);
      if (response.success) {
        setMembers(response.data);
      } else {
        toast({
          title: 'Erreur',
          description: response.error?.message || 'Impossible de charger les membres',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des membres:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les membres',
        variant: 'destructive',
      });
    }
  };

  const loadInvitations = async () => {
    try {
      const response = await fetchWithAuth(`/api/workspaces/${workspaceId}/invitations`);
      if (response.success) {
        setInvitations(response.data);
      } else {
        toast({
          title: 'Erreur',
          description: response.error?.message || 'Impossible de charger les invitations',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des invitations:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les invitations',
        variant: 'destructive',
      });
    }
  };

  const searchUsers = async () => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetchWithAuth(
        `/api/users/search?query=${encodeURIComponent(searchTerm)}&workspaceId=${workspaceId}`
      );
      if (response.success) {
        setSearchResults(response.data);
      } else {
        toast({
          title: 'Erreur',
          description: response.error?.message || 'Impossible de rechercher des utilisateurs',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Erreur lors de la recherche d'utilisateurs:", error);
      toast({
        title: 'Erreur',
        description: 'Impossible de rechercher des utilisateurs',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Rechercher des utilisateurs lorsque le terme de recherche change
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm) {
        searchUsers();
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  const inviteUser = async () => {
    if (!inviteEmail) return;

    setIsInviting(true);
    try {
      const response = await fetchWithAuth(`/api/workspaces/${workspaceId}/invitations`, {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (response.success) {
        toast({
          title: 'Invitation envoyée',
          description: `Invitation envoyée à ${inviteEmail}`,
        });
        setInviteEmail('');
        loadInvitations();
      } else {
        toast({
          title: 'Erreur',
          description: response.error?.message || "Impossible d'envoyer l'invitation",
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'invitation:", error);
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer l'invitation",
        variant: 'destructive',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const addMember = async (userId: string, role: string = 'member') => {
    try {
      const response = await fetchWithAuth(`/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          role,
        }),
      });

      if (response.success) {
        toast({
          title: 'Membre ajouté',
          description: 'Membre ajouté avec succès',
        });
        loadMembers();
        setSearchTerm('');
        setSearchResults([]);
      } else {
        toast({
          title: 'Erreur',
          description: response.error?.message || "Impossible d'ajouter le membre",
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout d'un membre:", error);
      toast({
        title: 'Erreur',
        description: "Impossible d'ajouter le membre",
        variant: 'destructive',
      });
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetchWithAuth(
        `/api/workspaces/${workspaceId}/invitations/${invitationId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.success) {
        toast({
          title: 'Invitation annulée',
          description: "L'invitation a été annulée",
        });
        loadInvitations();
      } else {
        toast({
          title: 'Erreur',
          description: response.error?.message || "Impossible d'annuler l'invitation",
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error("Erreur lors de l'annulation de l'invitation:", error);
      toast({
        title: 'Erreur',
        description: "Impossible d'annuler l'invitation",
        variant: 'destructive',
      });
    }
  };

  const isAdmin = () => {
    if (!user || !currentWorkspace) return false;
    if (currentWorkspace.owner_id === user.id) return true;

    const member = members.find(m => m.user_id === user.id);
    return member?.role === 'admin';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gestion des membres - {currentWorkspace?.name}</DialogTitle>
          <DialogDescription>
            Gérez les membres de votre espace de travail et invitez de nouvelles personnes.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="members" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="members">Membres ({members.length})</TabsTrigger>
            <TabsTrigger value="invitations">Invitations ({invitations.length})</TabsTrigger>
            {isAdmin() && <TabsTrigger value="invite">Inviter</TabsTrigger>}
          </TabsList>

          {/* Tab des membres actuels */}
          <TabsContent value="members" className="space-y-4">
            <div className="space-y-2">
              {members.map(member => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      {member.users.avatar_url ? (
                        <Image
                          src={member.users.avatar_url}
                          alt={member.users.display_name || 'User'}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <User size={16} />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{member.users.display_name || 'Sans nom'}</div>
                      <div className="text-xs text-gray-500">{member.users.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role === 'owner' ? (
                      <div className="flex items-center gap-1 text-sm bg-amber-100 px-2 py-1 rounded">
                        <ShieldAlert size={14} />
                        Propriétaire
                      </div>
                    ) : member.role === 'admin' ? (
                      <div className="flex items-center gap-1 text-sm bg-blue-100 px-2 py-1 rounded">
                        <Shield size={14} />
                        Admin
                      </div>
                    ) : (
                      <div className="text-sm px-2 py-1 bg-gray-100 rounded">Membre</div>
                    )}
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <div className="text-center py-4 text-gray-500">Aucun membre trouvé</div>
              )}
            </div>
          </TabsContent>

          {/* Tab des invitations */}
          <TabsContent value="invitations" className="space-y-4">
            <div className="space-y-2">
              {invitations.map(invitation => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-400" />
                    <div>
                      <div className="font-medium">{invitation.invited_email}</div>
                      <div className="text-xs text-gray-500">
                        Invité par {invitation.users.display_name || invitation.users.email}
                        {' • '}
                        {invitation.role === 'admin' ? 'Admin' : 'Membre'}
                        {' • '}
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {isAdmin() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => cancelInvitation(invitation.id)}
                      title="Annuler l'invitation"
                    >
                      <X size={16} className="text-gray-500" />
                    </Button>
                  )}
                </div>
              ))}
              {invitations.length === 0 && (
                <div className="text-center py-4 text-gray-500">Aucune invitation en cours</div>
              )}
            </div>
          </TabsContent>

          {/* Tab pour inviter des membres */}
          {isAdmin() && (
            <TabsContent value="invite" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Rôle</Label>
                  <select
                    id="role"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                  >
                    <option value="member">Membre</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>

                <Button onClick={inviteUser} disabled={!inviteEmail || isInviting}>
                  {isInviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>Inviter par email</>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Ou rechercher un utilisateur
                    </span>
                  </div>
                </div>

                <Input
                  type="search"
                  placeholder="Rechercher par nom ou email"
                  value={searchTerm}
                  onChange={handleSearch}
                />

                {isSearching && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {searchResults.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 border rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            {user.avatar_url ? (
                              <Image
                                src={user.avatar_url}
                                alt={user.display_name || 'User'}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <User size={16} />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{user.display_name || 'Sans nom'}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addMember(user.id)}
                          title="Ajouter comme membre"
                        >
                          <Check size={16} className="mr-1" /> Ajouter
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {searchTerm && searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-2 text-gray-500">
                    Aucun utilisateur trouvé. Vous pouvez inviter {searchTerm} par email.
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
