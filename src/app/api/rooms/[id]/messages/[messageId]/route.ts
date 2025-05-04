import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/lib/auth-api';
import { apiSuccess, apiError, handleSupabaseError, ApiErrorCodes } from '@/lib/api-utils';

// Fonction utilitaire pour vérifier les permissions de suppression d'un message
async function checkMessageDeletePermission(roomId: string, messageId: string, userId: string) {
  const supabase = await createClient();

  // Vérifier si le message existe
  const { data: message, error: messageError } = await supabase
    .from('chat_messages')
    .select('user_id, room_id')
    .eq('id', messageId)
    .eq('room_id', roomId)
    .single();

  if (messageError || !message) {
    return { hasPermission: false, isAuthor: false, isAdmin: false };
  }

  // Vérifier si l'utilisateur est l'auteur du message
  const isAuthor = message.user_id === userId;
  if (isAuthor) {
    return { hasPermission: true, isAuthor: true, isAdmin: false };
  }

  // Récupérer l'ID du workspace associé à la salle
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('workspace_id')
    .eq('id', roomId)
    .single();

  if (roomError || !room) {
    return { hasPermission: false, isAuthor: false, isAdmin: false };
  }

  // Vérifier si l'utilisateur est propriétaire du workspace
  const { data: isOwner } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', room.workspace_id)
    .eq('owner_id', userId)
    .single();

  if (isOwner) {
    return { hasPermission: true, isAuthor: false, isAdmin: true };
  }

  // Vérifier si l'utilisateur est admin du workspace
  const { data: isAdmin } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', room.workspace_id)
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();

  if (isAdmin) {
    return { hasPermission: true, isAuthor: false, isAdmin: true };
  }

  return { hasPermission: false, isAuthor: false, isAdmin: false };
}

// DELETE /api/rooms/[id]/messages/[messageId] - Supprimer un message
export const DELETE = withAuth(async (req, ctx, user) => {
  try {
    const { id: roomId, messageId } = ctx.params;

    // Vérifier les permissions de suppression
    const { hasPermission } = await checkMessageDeletePermission(
      roomId as string,
      messageId as string,
      user.id
    );

    if (!hasPermission) {
      return apiError(
        "Vous n'avez pas les droits pour supprimer ce message",
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    const supabase = await createClient();

    // Supprimer le message
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId)
      .eq('room_id', roomId);

    if (error) throw error;

    return apiSuccess({ success: true });
  } catch (error) {
    return handleSupabaseError(error);
  }
});
