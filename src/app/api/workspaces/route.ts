import { apiSuccess, handleSupabaseError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth-api';
import { validateRequest } from '@/lib/validation';
import { createClient } from '@/utils/supabase/server';

// GET /api/workspaces - Récupérer tous les workspaces de l'utilisateur
export const GET = withAuth(async (req, ctx, user) => {
  try {
    const supabase = await createClient();

    // Récupérer les workspaces dont l'utilisateur est propriétaire
    const { data: ownedWorkspaces, error: ownedError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('owner_id', user.id);

    if (ownedError) throw ownedError;

    // Récupérer les workspaces dont l'utilisateur est membre
    const { data: memberWorkspaces, error: memberError } = await supabase
      .from('workspace_members')
      .select(
        `
        workspace_id,
        role,
        workspaces (*)
      `
      )
      .eq('user_id', user.id);

    if (memberError) throw memberError;

    // Extraire les workspaces des membres
    const memberWorkspacesData = memberWorkspaces
      ? memberWorkspaces.map((m: any) => m.workspaces as unknown as any)
      : [];

    // Fusionner et dédupliquer les workspaces
    const allWorkspaces = [...(ownedWorkspaces || []), ...memberWorkspacesData];
    const uniqueWorkspaces = allWorkspaces.filter(
      (w, index, self) => index === self.findIndex(t => t.id === w.id)
    );

    return apiSuccess(uniqueWorkspaces);
  } catch (error) {
    return handleSupabaseError(error);
  }
});

// POST /api/workspaces - Créer un nouveau workspace
export const POST = withAuth(async (req, ctx, user) => {
  try {
    // Récupérer les données du corps de la requête
    const body = await req.json();

    // Valider les données
    const validationError = validateRequest(body, {
      name: { required: true, minLength: 3, maxLength: 50 },
      description: { maxLength: 500 },
      logo_url: { pattern: /^https?:\/\/.+/ },
    });

    if (validationError) return validationError;

    const supabase = await createClient();

    // Créer le workspace
    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        name: body.name,
        description: body.description || null,
        logo_url: body.logo_url || null,
        owner_id: user.id,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Ajouter automatiquement le créateur comme membre avec le rôle admin
    const { error: memberError } = await supabase.from('workspace_members').insert({
      workspace_id: data.id,
      user_id: user.id,
      role: 'admin',
    });

    if (memberError) throw memberError;

    return apiSuccess(data, 201);
  } catch (error) {
    return handleSupabaseError(error);
  }
});
