import { createClient } from '@/utils/supabase/server';
import { withAuth, getFullUser } from '@/lib/auth-api';
import { apiSuccess, handleSupabaseError } from '@/lib/api-utils';
import { validateRequest } from '@/lib/validation';

// GET /api/users/me - Récupérer le profil de l'utilisateur connecté
export const GET = withAuth(async (req, ctx, user) => {
  try {
    // Récupérer les détails complets de l'utilisateur
    const userData = await getFullUser(user.id);

    // Récupérer les workspaces dont l'utilisateur est propriétaire ou membre
    const supabase = await createClient();

    const { data: ownedWorkspaces, error: ownedError } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('owner_id', user.id);

    if (ownedError) throw ownedError;

    const { data: memberWorkspaces, error: memberError } = await supabase
      .from('workspace_members')
      .select(
        `
        role,
        workspaces (id, name)
      `
      )
      .eq('user_id', user.id);

    if (memberError) throw memberError;

    // Préparer les données de l'utilisateur
    const profile = {
      ...userData,
      workspaces: {
        owned: ownedWorkspaces || [],
        member:
          memberWorkspaces?.map(m => ({
            ...m.workspaces,
            role: m.role,
          })) || [],
      },
    };

    return apiSuccess(profile);
  } catch (error) {
    return handleSupabaseError(error);
  }
});

// PUT /api/users/me - Mettre à jour le profil de l'utilisateur
export const PUT = withAuth(async (req, ctx, user) => {
  try {
    const body = await req.json();

    // Valider les données
    const validationError = validateRequest(body, {
      display_name: { minLength: 2, maxLength: 50 },
      avatar_url: { pattern: /^https?:\/\/.+/ },
      bio: { maxLength: 500 },
      timezone: { maxLength: 50 },
    });

    if (validationError) return validationError;

    const supabase = await createClient();

    // Mettre à jour le profil utilisateur
    const { data, error } = await supabase
      .from('users')
      .update({
        ...(body.display_name !== undefined && { display_name: body.display_name }),
        ...(body.avatar_url !== undefined && { avatar_url: body.avatar_url }),
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.timezone !== undefined && { timezone: body.timezone }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    return apiSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
});
