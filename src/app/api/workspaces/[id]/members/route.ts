import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/lib/auth-api';
import { apiSuccess, apiError, handleSupabaseError, ApiErrorCodes } from '@/lib/api-utils';
import { validateRequest } from '@/lib/validation';

// GET /api/workspaces/[id]/members - Liste des membres d'un workspace
export const GET = withAuth(async (req, ctx, user) => {
  try {
    const { id } = ctx.params;
    const supabase = await createClient();

    // Vérifier l'accès au workspace
    const { data: accessCheck } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', user.id)
      .single();

    const { data: isOwner } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single();

    if (!accessCheck && !isOwner) {
      return apiError("Vous n'avez pas accès à ce workspace", ApiErrorCodes.FORBIDDEN, 403);
    }

    // Récupérer tous les membres avec leurs informations utilisateur
    const { data, error } = await supabase
      .from('workspace_members')
      .select(
        `
        id,
        role,
        user_id,
        workspace_id,
        created_at,
        users (id, display_name, avatar_url, email)
      `
      )
      .eq('workspace_id', id);

    if (error) throw error;

    // Ajouter le propriétaire à la liste
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select(
        `
        owner_id,
        users (id, display_name, avatar_url, email)
      `
      )
      .eq('id', id)
      .single();

    if (workspaceError) throw workspaceError;

    // Formater les données pour inclure le propriétaire
    const formattedData = [
      {
        id: null,
        role: 'owner',
        user_id: workspace.owner_id,
        workspace_id: id,
        users: workspace.users,
      },
      ...data,
    ];

    return apiSuccess(formattedData);
  } catch (error) {
    return handleSupabaseError(error);
  }
});

// POST /api/workspaces/[id]/members - Ajouter un membre au workspace
export const POST = withAuth(async (req, ctx, user) => {
  try {
    const { id } = ctx.params;
    const body = await req.json();

    // Valider les données
    const validationError = validateRequest(body, {
      user_id: { required: true, isUUID: true },
      role: { required: true, enum: ['admin', 'member'] },
    });

    if (validationError) return validationError;

    const supabase = await createClient();

    // Vérifier si l'utilisateur a les droits d'ajouter un membre
    const { data: isAdmin } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    const { data: isOwner } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single();

    if (!isAdmin && !isOwner) {
      return apiError(
        "Vous n'avez pas les droits pour ajouter un membre",
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    // Vérifier si l'utilisateur existe
    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('id', body.user_id)
      .single();

    if (!userExists) {
      return apiError("L'utilisateur spécifié n'existe pas", ApiErrorCodes.NOT_FOUND, 404);
    }

    // Vérifier si l'utilisateur est déjà membre
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', id)
      .eq('user_id', body.user_id)
      .single();

    if (existingMember) {
      return apiError('Cet utilisateur est déjà membre du workspace', ApiErrorCodes.DUPLICATE, 409);
    }

    // Ajouter le membre
    const { data, error } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: id,
        user_id: body.user_id,
        role: body.role,
      })
      .select()
      .single();

    if (error) throw error;

    return apiSuccess(data, 201);
  } catch (error) {
    return handleSupabaseError(error);
  }
});
