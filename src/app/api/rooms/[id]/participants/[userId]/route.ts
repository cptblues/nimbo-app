import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/lib/auth-api';
import { apiSuccess, apiError, handleSupabaseError, ApiErrorCodes } from '@/lib/api-utils';
import { validateRequest } from '@/lib/validation';

// Fonction utilitaire pour vérifier l'accès à la gestion d'un participant
async function checkParticipantManageAccess(
  roomId: string,
  targetUserId: string,
  currentUserId: string
) {
  const supabase = await createClient();

  // Vérifier si la salle existe
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('workspace_id')
    .eq('id', roomId)
    .single();

  if (roomError || !room) {
    return { hasAccess: false, isSelf: false, isAdmin: false };
  }

  // Vérifier si c'est l'utilisateur lui-même
  const isSelf = targetUserId === currentUserId;
  if (isSelf) {
    return { hasAccess: true, isSelf: true, isAdmin: false };
  }

  // Vérifier si l'utilisateur courant est propriétaire du workspace
  const { data: isOwner } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', room.workspace_id)
    .eq('owner_id', currentUserId)
    .single();

  if (isOwner) {
    return { hasAccess: true, isSelf: false, isAdmin: true };
  }

  // Vérifier si l'utilisateur courant est admin du workspace
  const { data: isAdmin } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', room.workspace_id)
    .eq('user_id', currentUserId)
    .eq('role', 'admin')
    .single();

  if (isAdmin) {
    return { hasAccess: true, isSelf: false, isAdmin: true };
  }

  return { hasAccess: false, isSelf: false, isAdmin: false };
}

// PUT /api/rooms/[id]/participants/[userId] - Mettre à jour l'état audio/vidéo d'un participant
export const PUT = withAuth(async (req, ctx, user) => {
  try {
    const { id: roomId, userId } = ctx.params;
    const body = await req.json();

    // Valider les données
    const validationError = validateRequest(body, {
      video_enabled: {
        custom: val => typeof val === 'boolean' || 'Le statut vidéo doit être un booléen',
      },
      audio_enabled: {
        custom: val => typeof val === 'boolean' || 'Le statut audio doit être un booléen',
      },
    });

    if (validationError) return validationError;

    // Vérifier l'accès à la gestion du participant
    const { hasAccess, isSelf } = await checkParticipantManageAccess(
      roomId as string,
      userId as string,
      user.id
    );

    // Seul l'utilisateur lui-même peut modifier son état audio/vidéo
    if (!hasAccess || !isSelf) {
      return apiError(
        "Vous ne pouvez pas modifier l'état audio/vidéo d'un autre utilisateur",
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    const supabase = await createClient();

    // Vérifier que l'utilisateur est bien dans la salle
    const { error: participationError } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (participationError) {
      return apiError(
        "Cet utilisateur n'est pas présent dans la salle",
        ApiErrorCodes.NOT_FOUND,
        404
      );
    }

    // Mettre à jour l'état audio/vidéo
    const { data, error } = await supabase
      .from('room_participants')
      .update({
        ...(body.video_enabled !== undefined && { video_enabled: body.video_enabled }),
        ...(body.audio_enabled !== undefined && { audio_enabled: body.audio_enabled }),
      })
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return apiSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
});

// DELETE /api/rooms/[id]/participants/[userId] - Quitter une salle ou expulser un participant
export const DELETE = withAuth(async (req, ctx, user) => {
  try {
    const { id: roomId, userId } = ctx.params;

    // Vérifier l'accès à la gestion du participant
    const { hasAccess, isSelf, isAdmin } = await checkParticipantManageAccess(
      roomId as string,
      userId as string,
      user.id
    );

    if (!hasAccess) {
      return apiError(
        "Vous n'avez pas les droits pour effectuer cette action",
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    // Une personne peut se retirer elle-même ou un admin peut expulser n'importe qui
    if (!isSelf && !isAdmin) {
      return apiError(
        "Vous ne pouvez pas expulser d'autres utilisateurs",
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    const supabase = await createClient();

    // Vérifier que l'utilisateur est bien dans la salle
    const { error: participationError } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (participationError) {
      return apiError(
        "Cet utilisateur n'est pas présent dans la salle",
        ApiErrorCodes.NOT_FOUND,
        404
      );
    }

    // Supprimer le participant de la salle
    const { error } = await supabase
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;

    return apiSuccess({ success: true });
  } catch (error) {
    return handleSupabaseError(error);
  }
});
