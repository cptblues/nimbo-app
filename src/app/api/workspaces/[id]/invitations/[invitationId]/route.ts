import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/lib/auth-api';
import { apiSuccess, apiError, handleSupabaseError, ApiErrorCodes } from '@/lib/api-utils';

// DELETE /api/workspaces/[id]/invitations/[invitationId] - Supprimer une invitation
export const DELETE = withAuth(async (req, ctx, user) => {
  try {
    const { id, invitationId } = ctx.params;
    const supabase = await createClient();

    // Vérifier si l'utilisateur a les droits de supprimer une invitation
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
        "Vous n'avez pas les droits pour supprimer cette invitation",
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    // Vérifier si l'invitation existe et appartient au workspace
    const { error: invitationError } = await supabase
      .from('workspace_invitations')
      .select('id')
      .eq('id', invitationId)
      .eq('workspace_id', id)
      .single();

    if (invitationError) {
      return apiError("L'invitation n'existe pas", ApiErrorCodes.NOT_FOUND, 404);
    }

    // Supprimer l'invitation
    const { error } = await supabase.from('workspace_invitations').delete().eq('id', invitationId);

    if (error) throw error;

    return apiSuccess({ message: 'Invitation supprimée avec succès' });
  } catch (error) {
    return handleSupabaseError(error);
  }
});
