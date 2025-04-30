import { redirect } from 'next/navigation';
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

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect('/auth/login');
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Profil utilisateur</CardTitle>
          <CardDescription>Vos informations de profil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-sm font-medium">Email :</div>
            <div>{data.user.email}</div>

            <div className="text-sm font-medium">ID :</div>
            <div className="text-xs truncate">{data.user.id}</div>

            <div className="text-sm font-medium">Créé le :</div>
            <div>{new Date(data.user.created_at).toLocaleDateString()}</div>
          </div>
        </CardContent>
        <CardFooter>
          <form action="/auth/signout" method="post" className="w-full">
            <Button type="submit" variant="outline" className="w-full">
              Se déconnecter
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
