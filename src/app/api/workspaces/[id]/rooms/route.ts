import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/lib/auth-api';
import { apiSuccess, apiError, handleSupabaseError, ApiErrorCodes } from '@/lib/api-utils';
import { validateRequest } from '@/lib/validation';
import { Room } from '@/types/database.types';

// Fonction utilitaire pour vérifier l'accès au workspace
async function checkWorkspaceAccess(workspaceId: string, userId: string) {
  const supabase = await createClient();

  // Vérifier si l'utilisateur est propriétaire
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .eq('owner_id', userId)
    .single();

  if (workspace) {
    return { hasAccess: true, isOwner: true, workspace };
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
      isOwner: false,
      isAdmin: membership.role === 'admin',
      workspace: membership.workspaces,
    };
  }

  return { hasAccess: false, isOwner: false, isAdmin: false };
}

// GET /api/workspaces/[id]/rooms - Liste des salles d'un workspace
export const GET = withAuth(async (req, ctx, user) => {
  try {
    const { id: workspaceId } = ctx.params;

    // Vérifier l'accès au workspace
    const { hasAccess } = await checkWorkspaceAccess(workspaceId as string, user.id);

    if (!hasAccess) {
      return apiError("Vous n'avez pas accès à ce workspace", ApiErrorCodes.FORBIDDEN, 403);
    }

    const supabase = await createClient();

    // Récupérer toutes les salles du workspace
    const { data, error } = await supabase
      .from('rooms')
      .select(
        `
        id,
        name,
        description,
        type,
        capacity,
        created_at,
        updated_at,
        workspace_id
      `
      )
      .eq('workspace_id', workspaceId)
      .order('name');

    if (error) throw error;

    // Pour chaque salle, récupérer le nombre de participants
    const roomsWithParticipants = await Promise.all(
      (data || []).map(async (room: Room) => {
        const { count, error: countError } = await supabase
          .from('room_participants')
          .select('id', { count: 'exact' })
          .eq('room_id', room.id);

        if (countError) throw countError;

        return {
          ...room,
          participant_count: count || 0,
        };
      })
    );

    return apiSuccess(roomsWithParticipants);
  } catch (error) {
    return handleSupabaseError(error);
  }
});

// POST /api/workspaces/[id]/rooms - Créer une salle dans un workspace
export const POST = withAuth(async (req, ctx, user) => {
  try {
    const { id: workspaceId } = ctx.params;
    const body = await req.json();

    // Valider les données
    const validationError = validateRequest(body, {
      name: { required: true, minLength: 3, maxLength: 50 },
      description: { maxLength: 500 },
      type: { required: true, enum: ['meeting', 'lounge', 'focus', 'general'] },
      capacity: {
        custom: val =>
          val === undefined ||
          val === null ||
          (typeof val === 'number' && val > 0) ||
          'La capacité doit être un nombre positif',
      },
    });

    if (validationError) return validationError;

    // Vérifier l'accès au workspace (seul le propriétaire ou admin peut créer une salle)
    const { hasAccess, isOwner, isAdmin } = await checkWorkspaceAccess(
      workspaceId as string,
      user.id
    );

    if (!hasAccess) {
      return apiError("Vous n'avez pas accès à ce workspace", ApiErrorCodes.FORBIDDEN, 403);
    }

    if (!isOwner && !isAdmin) {
      return apiError(
        'Seuls les administrateurs peuvent créer des salles',
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    const supabase = await createClient();

    // Créer la salle
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        workspace_id: workspaceId,
        name: body.name,
        description: body.description || null,
        type: body.type,
        capacity: body.capacity || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return apiSuccess(data, 201);
  } catch (error) {
    return handleSupabaseError(error);
  }
});
