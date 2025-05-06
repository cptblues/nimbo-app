import { createClient } from '@/utils/supabase/server';
import { apiSuccess, apiError, handleSupabaseError, ApiErrorCodes } from '@/lib/api-utils';
import { Invitation } from '@/types/api/invitation';

// GET /api/invitations/verify - Vérifier la validité d'une invitation
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    console.log('DEBUG - URL complète:', req.url);
    console.log('DEBUG - Token reçu:', token);

    if (!token) {
      console.log('DEBUG - Erreur: Token manquant');
      return apiError('Token manquant', ApiErrorCodes.VALIDATION, 400);
    }

    // Ajout d'un chemin de test pour isoler le problème
    if (token === 'test-token') {
      console.log('DEBUG - Token de test détecté, retour de données factices');
      return apiSuccess({
        invited_email: 'test@example.com',
        workspace: {
          id: '123456',
          name: 'Workspace de test',
          description: 'Description de test',
          logo_url: null,
        },
        role: 'member',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });
    }

    const supabase = await createClient();

    console.log('DEBUG - Recherche du token dans la base de données:', token);

    // Récupérer l'invitation avec les infos du workspace
    const { data: invitation, error: invitationError } = (await supabase
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
      .eq('token', token)
      .single()) as { data: Invitation; error: any };

    console.log('DEBUG - Résultat de la requête:', { invitation, error: invitationError });

    if (invitationError) {
      console.log("DEBUG - Erreur lors de la récupération de l'invitation:", invitationError);
      return apiError("L'invitation n'existe pas ou a expiré", ApiErrorCodes.NOT_FOUND, 404);
    }

    // Vérifier si l'invitation est expirée
    if (new Date(invitation.expires_at) < new Date()) {
      console.log('DEBUG - Invitation expirée:', invitation.expires_at);
      return apiError("L'invitation a expiré", ApiErrorCodes.EXPIRED, 410);
    }

    // Vérifier si l'invitation est déjà traitée
    if (invitation.status !== 'pending') {
      console.log('DEBUG - Invitation déjà traitée:', invitation.status);
      return apiError(
        `L'invitation a déjà été ${invitation.status === 'accepted' ? 'acceptée' : 'rejetée'}`,
        ApiErrorCodes.INVALID_STATE,
        400
      );
    }

    console.log('DEBUG - Invitation valide:', invitation);

    return apiSuccess({
      id: invitation.id,
      invited_email: invitation.invited_email,
      workspace_id: invitation.workspace_id,
      role: invitation.role,
      expires_at: invitation.expires_at,
      status: invitation.status,
      workspace: {
        id: invitation.workspace_id,
        name: invitation.workspaces.name,
        description: invitation.workspaces.description,
        logo_url: invitation.workspaces.logo_url,
      },
    });
  } catch (error) {
    console.log('DEBUG - Exception non gérée:', error);
    return handleSupabaseError(error);
  }
}
