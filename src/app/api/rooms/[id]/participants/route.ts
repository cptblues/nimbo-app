import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/lib/auth-api';
import { apiSuccess, apiError, handleSupabaseError, ApiErrorCodes } from '@/lib/api-utils';

// Fonction utilitaire pour vérifier l'accès à une salle
async function checkRoomAccess(roomId: string, userId: string) {
  const supabase = await createClient();

  // Vérifier si la salle existe
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*') // Sélectionner toutes les colonnes pour avoir capacity
    .eq('id', roomId)
    .single();

  if (roomError || !room) {
    return { hasAccess: false, room: null };
  }

  // Vérifier si l'utilisateur est propriétaire du workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', room.workspace_id)
    .eq('owner_id', userId)
    .single();

  if (workspace) {
    return { hasAccess: true, room };
  }

  // Vérifier si l'utilisateur est membre du workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', room.workspace_id)
    .eq('user_id', userId)
    .single();

  if (membership) {
    return { hasAccess: true, room };
  }

  return { hasAccess: false, room: null };
}

// GET /api/rooms/[id]/participants - Liste des participants d'une salle
export const GET = withAuth(async (req, ctx, user) => {
  try {
    const { id: roomId } = ctx.params;

    // Vérifier l'accès à la salle
    const { hasAccess } = await checkRoomAccess(roomId as string, user.id);

    if (!hasAccess) {
      return apiError("Vous n'avez pas accès à cette salle", ApiErrorCodes.FORBIDDEN, 403);
    }

    const supabase = await createClient();

    // Récupérer tous les participants de la salle
    const { data, error } = await supabase
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

    if (error) throw error;

    return apiSuccess(data || []);
  } catch (error) {
    return handleSupabaseError(error);
  }
});

// POST /api/rooms/[id]/participants - Rejoindre une salle
export const POST = withAuth(async (req, ctx, user) => {
  try {
    const { id: roomId } = ctx.params;

    // Vérifier l'accès à la salle
    const { hasAccess, room } = await checkRoomAccess(roomId as string, user.id);

    if (!hasAccess || !room) {
      return apiError("Vous n'avez pas accès à cette salle", ApiErrorCodes.FORBIDDEN, 403);
    }

    const supabase = await createClient();

    // Vérifier si l'utilisateur est déjà dans une salle du même workspace
    const { data: existingParticipation } = await supabase
      .from('room_participants')
      .select('id, rooms(workspace_id)')
      .eq('user_id', user.id)
      .not('room_id', 'eq', roomId)
      .single();

    // Si l'utilisateur est déjà dans une autre salle du même workspace, le retirer
    if (
      existingParticipation &&
      (existingParticipation.rooms as any).workspace_id === room.workspace_id
    ) {
      await supabase.from('room_participants').delete().eq('id', existingParticipation.id);
    }

    // Vérifier si la salle a une capacité et si elle est atteinte
    if (room && room.capacity) {
      const { count, error: countError } = await supabase
        .from('room_participants')
        .select('id', { count: 'exact' })
        .eq('room_id', roomId);

      if (countError) throw countError;

      if (count && count >= room.capacity) {
        return apiError('La salle a atteint sa capacité maximale', ApiErrorCodes.FORBIDDEN, 403);
      }
    }

    // Vérifier si l'utilisateur est déjà dans cette salle
    const { data: alreadyJoined } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    // Si l'utilisateur est déjà présent, renvoyer ses informations
    if (alreadyJoined) {
      return apiSuccess(alreadyJoined);
    }

    // Ajouter l'utilisateur à la salle
    const { data, error } = await supabase
      .from('room_participants')
      .insert({
        room_id: roomId,
        user_id: user.id,
        joined_at: new Date().toISOString(),
        video_enabled: true,
        audio_enabled: true,
      })
      .select()
      .single();

    if (error) throw error;

    return apiSuccess(data, 201);
  } catch (error) {
    return handleSupabaseError(error);
  }
});
