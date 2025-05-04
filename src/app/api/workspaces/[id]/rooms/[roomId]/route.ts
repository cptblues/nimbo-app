import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/lib/auth-api';
import { apiSuccess, apiError, handleSupabaseError, ApiErrorCodes } from '@/lib/api-utils';
import { validateRequest } from '@/lib/validation';

// Fonction utilitaire pour vérifier l'accès à une salle
async function checkRoomAccess(workspaceId: string, roomId: string, userId: string) {
  const supabase = await createClient();

  // Vérifier si la salle existe et appartient au workspace
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .eq('workspace_id', workspaceId)
    .single();

  if (roomError || !room) {
    return { hasAccess: false, room: null, isOwner: false, isAdmin: false };
  }

  // Vérifier si l'utilisateur est propriétaire du workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .eq('owner_id', userId)
    .single();

  if (workspace) {
    return { hasAccess: true, room, isOwner: true, isAdmin: true };
  }

  // Vérifier si l'utilisateur est membre du workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (membership) {
    return {
      hasAccess: true,
      room,
      isOwner: false,
      isAdmin: membership.role === 'admin',
    };
  }

  return { hasAccess: false, room: null, isOwner: false, isAdmin: false };
}

// GET /api/workspaces/[id]/rooms/[roomId] - Récupérer les détails d'une salle
export const GET = withAuth(async (req, ctx, user) => {
  try {
    const { id: workspaceId, roomId } = ctx.params;

    // Vérifier l'accès à la salle
    const { hasAccess, room } = await checkRoomAccess(
      workspaceId as string,
      roomId as string,
      user.id
    );

    if (!hasAccess) {
      return apiError("Vous n'avez pas accès à cette salle", ApiErrorCodes.FORBIDDEN, 403);
    }

    const supabase = await createClient();

    // Récupérer les participants actuels de la salle
    const { data: participants, error: participantsError } = await supabase
      .from('room_participants')
      .select(
        `
        id,
        user_id,
        joined_at,
        video_enabled,
        audio_enabled,
        users (id, display_name, avatar_url, status, status_message)
      `
      )
      .eq('room_id', roomId);

    if (participantsError) throw participantsError;

    // Assembler les données complètes de la salle
    const roomWithParticipants = {
      ...room,
      participants: participants || [],
    };

    return apiSuccess(roomWithParticipants);
  } catch (error) {
    return handleSupabaseError(error);
  }
});

// PUT /api/workspaces/[id]/rooms/[roomId] - Modifier une salle
export const PUT = withAuth(async (req, ctx, user) => {
  try {
    const { id: workspaceId, roomId } = ctx.params;
    const body = await req.json();

    // Valider les données
    const validationError = validateRequest(body, {
      name: { minLength: 3, maxLength: 50 },
      description: { maxLength: 500 },
      type: { enum: ['meeting', 'lounge', 'focus', 'general'] },
      capacity: {
        custom: val =>
          val === undefined ||
          val === null ||
          (typeof val === 'number' && val > 0) ||
          'La capacité doit être un nombre positif',
      },
    });

    if (validationError) return validationError;

    // Vérifier l'accès à la salle (seul le propriétaire ou admin peut modifier)
    const { hasAccess, isOwner, isAdmin } = await checkRoomAccess(
      workspaceId as string,
      roomId as string,
      user.id
    );

    if (!hasAccess) {
      return apiError("Vous n'avez pas accès à cette salle", ApiErrorCodes.FORBIDDEN, 403);
    }

    if (!isOwner && !isAdmin) {
      return apiError(
        'Seuls les administrateurs peuvent modifier les salles',
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    const supabase = await createClient();

    // Mettre à jour la salle
    const { data, error } = await supabase
      .from('rooms')
      .update({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.capacity !== undefined && { capacity: body.capacity }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', roomId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    return apiSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
});

// DELETE /api/workspaces/[id]/rooms/[roomId] - Supprimer une salle
export const DELETE = withAuth(async (req, ctx, user) => {
  try {
    const { id: workspaceId, roomId } = ctx.params;

    // Vérifier l'accès à la salle (seul le propriétaire ou admin peut supprimer)
    const { hasAccess, isOwner, isAdmin } = await checkRoomAccess(
      workspaceId as string,
      roomId as string,
      user.id
    );

    if (!hasAccess) {
      return apiError("Vous n'avez pas accès à cette salle", ApiErrorCodes.FORBIDDEN, 403);
    }

    if (!isOwner && !isAdmin) {
      return apiError(
        'Seuls les administrateurs peuvent supprimer les salles',
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    const supabase = await createClient();

    // Supprimer les participants de la salle
    await supabase.from('room_participants').delete().eq('room_id', roomId);

    // Supprimer les messages de chat de la salle
    await supabase.from('chat_messages').delete().eq('room_id', roomId);

    // Supprimer la salle
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    return apiSuccess({ success: true });
  } catch (error) {
    return handleSupabaseError(error);
  }
});
