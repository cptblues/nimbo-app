import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/lib/auth-api';
import { apiSuccess, apiError, handleSupabaseError, ApiErrorCodes } from '@/lib/api-utils';
import { validateRequest } from '@/lib/validation';

// POST /api/invitations - Accepter/rejeter une invitation
export const POST = withAuth(async (req, ctx, user) => {
  try {
    const body = await req.json();

    // Valider les données
    const validationError = validateRequest(body, {
      token: { required: true },
      action: { required: true, enum: ['accept', 'reject'] },
    });

    if (validationError) return validationError;

    const supabase = await createClient();

    // Récupérer l'invitation avec les infos du workspace
    const { data: invitation, error: invitationError } = await supabase
      .from('workspace_invitations')
      .select(
        `
        id,
        workspace_id,
        invited_email,
        role,
        status,
        expires_at,
        workspaces (
          id,
          name,
          description,
          logo_url
        )
      `
      )
      .eq('token', body.token)
      .single();

    if (invitationError) {
      return apiError("L'invitation n'existe pas ou a expiré", ApiErrorCodes.NOT_FOUND, 404);
    }

    // Vérifier si l'invitation est expirée
    if (new Date(invitation.expires_at) < new Date()) {
      return apiError("L'invitation a expiré", ApiErrorCodes.EXPIRED, 410);
    }

    // Vérifier si l'invitation est déjà traitée
    if (invitation.status !== 'pending') {
      return apiError(
        `L'invitation a déjà été ${invitation.status === 'accepted' ? 'acceptée' : 'rejetée'}`,
        ApiErrorCodes.INVALID_STATE,
        400
      );
    }

    // Vérifier que l'email de l'utilisateur correspond à l'invitation
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    if (userData && userData.email !== invitation.invited_email) {
      return apiError('Cette invitation ne vous est pas destinée', ApiErrorCodes.FORBIDDEN, 403);
    }

    // Traiter l'acceptation ou le rejet
    if (body.action === 'accept') {
      // Transaction pour mettre à jour le statut et ajouter l'utilisateur au workspace
      const { error: updateError } = await supabase.rpc('accept_workspace_invitation', {
        invitation_id: invitation.id,
        user_id: user.id,
      });

      // Si la procédure stockée n'est pas disponible, faire les opérations manuellement
      if (updateError) {
        // Mise à jour du statut de l'invitation
        const { error: statusError } = await supabase
          .from('workspace_invitations')
          .update({ status: 'accepted' })
          .eq('id', invitation.id);

        if (statusError) throw statusError;

        // Vérifier si l'utilisateur n'est pas déjà membre (cas rare mais possible)
        const { data: existingMember } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', invitation.workspace_id)
          .eq('user_id', user.id)
          .single();

        if (!existingMember) {
          // Ajout de l'utilisateur comme membre du workspace
          const { error: memberError } = await supabase.from('workspace_members').insert({
            workspace_id: invitation.workspace_id,
            user_id: user.id,
            role: invitation.role,
          });

          if (memberError) throw memberError;
        }
      }

      return apiSuccess({
        status: 'accepted',
        workspace: invitation.workspaces,
      });
    } else {
      // Rejeter l'invitation
      const { error: rejectError } = await supabase
        .from('workspace_invitations')
        .update({ status: 'rejected' })
        .eq('id', invitation.id);

      if (rejectError) throw rejectError;

      return apiSuccess({
        status: 'rejected',
      });
    }
  } catch (error) {
    return handleSupabaseError(error);
  }
});
