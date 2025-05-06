import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/lib/auth-api';
import { apiSuccess, apiError, handleSupabaseError, ApiErrorCodes } from '@/lib/api-utils';
import { validateRequest } from '@/lib/validation';
import { v4 as uuidv4 } from 'uuid';

// GET /api/workspaces/[id]/invitations - Liste des invitations d'un workspace
export const GET = withAuth(async (req, ctx, user) => {
  try {
    const { id } = await ctx.params;
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

    // Récupérer toutes les invitations avec les informations de l'invitant
    const { data, error } = await supabase
      .from('workspace_invitations')
      .select(
        `
        id,
        workspace_id,
        invited_email,
        invited_by,
        role,
        status,
        expires_at,
        created_at,
        users (id, display_name, avatar_url, email)
      `
      )
      .eq('workspace_id', id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return apiSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
});

// POST /api/workspaces/[id]/invitations - Créer une invitation
export const POST = withAuth(async (req, ctx, user) => {
  try {
    const { id } = ctx.params;
    const body = await req.json();

    // Valider les données
    const validationError = validateRequest(body, {
      email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
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
        "Vous n'avez pas les droits pour inviter un membre",
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    // Vérifier si cet email est déjà membre
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', body.email)
      .single();

    if (existingUser) {
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', id)
        .eq('user_id', existingUser.id)
        .single();

      if (existingMember) {
        return apiError(
          'Cet utilisateur est déjà membre du workspace',
          ApiErrorCodes.DUPLICATE,
          409
        );
      }
    }

    // Vérifier si une invitation est déjà en cours pour cet email
    const { data: existingInvitation } = await supabase
      .from('workspace_invitations')
      .select('id, status')
      .eq('workspace_id', id)
      .eq('invited_email', body.email)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return apiError(
        'Une invitation est déjà en cours pour cet email',
        ApiErrorCodes.DUPLICATE,
        409
      );
    }

    // Générer un token unique
    const token = uuidv4();

    // Créer l'invitation
    const { data, error } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: id,
        invited_email: body.email,
        invited_by: user.id,
        role: body.role,
        token,
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: Envoi de l'email d'invitation (sera implémenté ultérieurement)
    // Pour le moment, retourner le token dans la réponse pour les tests
    return apiSuccess(
      {
        ...data,
        invite_link: `${process.env.NEXT_PUBLIC_APP_URL}/invitations/accept?token=${token}`,
      },
      201
    );
  } catch (error) {
    return handleSupabaseError(error);
  }
});
