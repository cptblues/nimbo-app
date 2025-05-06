import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: userData } = await supabase.from('users').select('*').eq('id', user?.id).single();

  // Obtenir les initiales pour l'avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const displayName = userData?.display_name || user?.email?.split('@')[0] || 'Utilisateur';
  const initials = getInitials(displayName);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold">Mon Profil</h1>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={userData?.avatar_url || ''} alt={displayName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{displayName}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <h3 className="mb-2 font-medium">Statut</h3>
              <p>{userData?.status || 'Hors ligne'}</p>
            </div>

            <div>
              <h3 className="mb-2 font-medium">Message de statut</h3>
              <p>{userData?.status_message || 'Aucun message défini'}</p>
            </div>

            <div>
              <h3 className="mb-2 font-medium">Membre depuis</h3>
              <p>{new Date(userData?.created_at || '').toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Espaces de travail</CardTitle>
          <CardDescription>Les espaces de travail dont vous êtes membre</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Cette section sera développée ultérieurement.</p>
        </CardContent>
      </Card>
    </div>
  );
}
