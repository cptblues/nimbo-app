import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/lib/auth-api';
import { apiSuccess, apiError, handleSupabaseError, ApiErrorCodes } from '@/lib/api-utils';
import { validateRequest } from '@/lib/validation';

// Fonction utilitaire pour vérifier si l'utilisateur a accès au workspace
async function checkWorkspaceAccess(workspaceId: string, userId: string, requireOwner = false) {
  const supabase = await createClient();

  // Vérifier si l'utilisateur est propriétaire
  if (requireOwner) {
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .eq('owner_id', userId)
      .single();

    if (error || !workspace) {
      return { hasAccess: false, workspace: null, isOwner: false };
    }

    return { hasAccess: true, workspace, isOwner: true };
  }

  // Vérifier si l'utilisateur est propriétaire
  const { data: ownedWorkspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .eq('owner_id', userId)
    .single();

  if (ownedWorkspace) {
    return { hasAccess: true, workspace: ownedWorkspace, isOwner: true };
  }

  // Vérifier si l'utilisateur est membre
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role, workspaces(*)')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (membership) {
    return {
      hasAccess: true,
      workspace: membership.workspaces,
      isOwner: false,
      role: membership.role,
    };
  }

  return { hasAccess: false, workspace: null, isOwner: false };
}

// GET /api/workspaces/[id] - Récupérer un workspace par son ID
export const GET = withAuth(async (req, ctx, user) => {
  try {
    const { id } = ctx.params;

    // Vérifier l'accès au workspace
    const { hasAccess, workspace } = await checkWorkspaceAccess(id as string, user.id);

    if (!hasAccess) {
      return apiError("Vous n'avez pas accès à ce workspace", ApiErrorCodes.FORBIDDEN, 403);
    }

    return apiSuccess(workspace);
  } catch (error) {
    return handleSupabaseError(error);
  }
});

// PUT /api/workspaces/[id] - Mettre à jour un workspace
export const PUT = withAuth(async (req, ctx, user) => {
  try {
    const { id } = ctx.params;
    const body = await req.json();

    // Valider les données
    const validationError = validateRequest(body, {
      name: { minLength: 3, maxLength: 50 },
      description: { maxLength: 500 },
      logo_url: { pattern: /^https?:\/\/.+/ },
    });

    if (validationError) return validationError;

    // Vérifier l'accès au workspace (seul le propriétaire peut modifier)
    const { hasAccess, isOwner } = await checkWorkspaceAccess(id as string, user.id);

    if (!hasAccess) {
      return apiError("Vous n'avez pas accès à ce workspace", ApiErrorCodes.FORBIDDEN, 403);
    }

    if (!isOwner) {
      return apiError(
        'Seul le propriétaire peut modifier ce workspace',
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    const supabase = await createClient();

    // Mettre à jour le workspace
    const { data, error } = await supabase
      .from('workspaces')
      .update({
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.logo_url !== undefined && { logo_url: body.logo_url }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return apiSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
});

// DELETE /api/workspaces/[id] - Supprimer un workspace
export const DELETE = withAuth(async (req, ctx, user) => {
  try {
    const { id } = ctx.params;

    // Vérifier si l'utilisateur est le propriétaire
    const { hasAccess, isOwner } = await checkWorkspaceAccess(id as string, user.id, true);

    if (!hasAccess || !isOwner) {
      return apiError(
        'Seul le propriétaire peut supprimer ce workspace',
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    const supabase = await createClient();

    // Supprimer le workspace
    const { error } = await supabase.from('workspaces').delete().eq('id', id);

    if (error) throw error;

    return apiSuccess({ success: true });
  } catch (error) {
    return handleSupabaseError(error);
  }
});
