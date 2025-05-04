import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/lib/auth-api';
import { apiSuccess, apiError, handleSupabaseError, ApiErrorCodes } from '@/lib/api-utils';
import { validateRequest } from '@/lib/validation';

// Fonction utilitaire pour vérifier les permissions de l'utilisateur sur un workspace
async function checkWorkspacePermissions(workspaceId: string, userId: string) {
  const supabase = await createClient();

  // Vérifier si l'utilisateur est propriétaire
  const { data: isOwner } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .eq('owner_id', userId)
    .single();

  if (isOwner) {
    return { canModify: true, isOwner: true };
  }

  // Vérifier si l'utilisateur est admin
  const { data: isAdmin } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();

  if (isAdmin) {
    return { canModify: true, isOwner: false, isAdmin: true };
  }

  // Vérifier si l'utilisateur est membre
  const { data: isMember } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (isMember) {
    return { canModify: false, isOwner: false, isAdmin: false, isMember: true };
  }

  return { canModify: false, isOwner: false, isAdmin: false, isMember: false };
}

// GET /api/workspaces/[id]/members/[userId] - Récupérer les détails d'un membre
export const GET = withAuth(async (req, ctx, user) => {
  try {
    const { id, userId } = ctx.params;
    const supabase = await createClient();

    // Vérifier les permissions
    const { isMember } = await checkWorkspacePermissions(id as string, user.id);

    if (!isMember) {
      return apiError("Vous n'avez pas accès à ce workspace", ApiErrorCodes.FORBIDDEN, 403);
    }

    // Vérifier si le membre spécifié est le propriétaire
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id, users (id, display_name, avatar_url, email)')
      .eq('id', id)
      .single();

    if (workspace && workspace.owner_id === userId) {
      return apiSuccess({
        id: null,
        role: 'owner',
        user_id: userId,
        workspace_id: id,
        users: workspace.users,
      });
    }

    // Récupérer les détails du membre
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
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return apiError("Ce membre n'existe pas dans le workspace", ApiErrorCodes.NOT_FOUND, 404);
      }
      throw error;
    }

    return apiSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
});

// PUT /api/workspaces/[id]/members/[userId] - Modifier le rôle d'un membre
export const PUT = withAuth(async (req, ctx, user) => {
  try {
    const { id, userId } = ctx.params;
    const body = await req.json();

    // Valider les données
    const validationError = validateRequest(body, {
      role: { required: true, enum: ['admin', 'member'] },
    });

    if (validationError) return validationError;

    // Vérifier les permissions
    const { canModify, isOwner } = await checkWorkspacePermissions(id as string, user.id);

    if (!canModify) {
      return apiError(
        "Vous n'avez pas les droits pour modifier les membres",
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    const supabase = await createClient();

    // Vérifier que l'utilisateur cible n'est pas le propriétaire
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (workspace && workspace.owner_id === userId) {
      return apiError(
        'Le rôle du propriétaire ne peut pas être modifié',
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    // Vérifier que le membre existe
    const { data: existingMember, error: memberError } = await supabase
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .single();

    if (memberError) {
      return apiError("Ce membre n'existe pas dans le workspace", ApiErrorCodes.NOT_FOUND, 404);
    }

    // Seul le propriétaire peut promouvoir/rétrograder un admin
    if (!isOwner && existingMember.role === 'admin') {
      return apiError(
        "Seul le propriétaire peut modifier le rôle d'un administrateur",
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    // Mettre à jour le rôle du membre
    const { data, error } = await supabase
      .from('workspace_members')
      .update({ role: body.role })
      .eq('workspace_id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return apiSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
});

// DELETE /api/workspaces/[id]/members/[userId] - Supprimer un membre
export const DELETE = withAuth(async (req, ctx, user) => {
  try {
    const { id, userId } = ctx.params;

    // Vérifier les permissions
    const { canModify, isOwner } = await checkWorkspacePermissions(id as string, user.id);

    // L'utilisateur peut se supprimer lui-même
    const isSelf = user.id === userId;

    if (!canModify && !isSelf) {
      return apiError(
        "Vous n'avez pas les droits pour supprimer ce membre",
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    const supabase = await createClient();

    // Vérifier que l'utilisateur cible n'est pas le propriétaire
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (workspace && workspace.owner_id === userId) {
      return apiError(
        'Le propriétaire ne peut pas être supprimé du workspace',
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    // Vérifier si le membre est admin et que l'utilisateur n'est pas propriétaire
    if (!isOwner && !isSelf) {
      const { data: memberToDelete } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', id)
        .eq('user_id', userId)
        .single();

      if (memberToDelete && memberToDelete.role === 'admin') {
        return apiError(
          'Seul le propriétaire peut supprimer un administrateur',
          ApiErrorCodes.FORBIDDEN,
          403
        );
      }
    }

    // Supprimer le membre
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return apiSuccess({ success: true });
  } catch (error) {
    return handleSupabaseError(error);
  }
});
