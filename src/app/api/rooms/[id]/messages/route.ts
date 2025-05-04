import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/lib/auth-api';
import { apiSuccess, apiError, handleSupabaseError, ApiErrorCodes } from '@/lib/api-utils';
import { validateRequest } from '@/lib/validation';

// Fonction utilitaire pour vérifier l'accès à une salle
async function checkRoomAccess(roomId: string, userId: string) {
  const supabase = await createClient();

  // Vérifier si la salle existe
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('workspace_id')
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

// GET /api/rooms/[id]/messages - Récupérer les messages d'une salle
export const GET = withAuth(async (req, ctx, user) => {
  try {
    const { id: roomId } = ctx.params;
    const url = new URL(req.url);

    // Paramètres de pagination
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100); // Maximum 100 messages
    const before = url.searchParams.get('before'); // ID du message pour la pagination

    // Vérifier l'accès à la salle
    const { hasAccess } = await checkRoomAccess(roomId as string, user.id);

    if (!hasAccess) {
      return apiError("Vous n'avez pas accès à cette salle", ApiErrorCodes.FORBIDDEN, 403);
    }

    const supabase = await createClient();

    // Construire la requête de base
    let messagesQuery = supabase
      .from('chat_messages')
      .select(
        `
        id,
        content,
        created_at,
        user_id,
        users (id, display_name, avatar_url)
      `
      )
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Ajouter le filtre pour la pagination si spécifié
    if (before) {
      const { data: beforeMessage } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('id', before)
        .single();

      if (beforeMessage) {
        messagesQuery = messagesQuery.lt('created_at', beforeMessage.created_at);
      }
    }

    // Exécuter la requête
    const { data, error } = await messagesQuery;

    if (error) throw error;

    // Renvoyer les messages dans l'ordre chronologique (du plus ancien au plus récent)
    return apiSuccess(data ? data.reverse() : []);
  } catch (error) {
    return handleSupabaseError(error);
  }
});

// POST /api/rooms/[id]/messages - Envoyer un message dans une salle
export const POST = withAuth(async (req, ctx, user) => {
  try {
    const { id: roomId } = ctx.params;
    const body = await req.json();

    // Valider les données
    const validationError = validateRequest(body, {
      content: { required: true, minLength: 1, maxLength: 2000 },
    });

    if (validationError) return validationError;

    // Vérifier l'accès à la salle
    const { hasAccess } = await checkRoomAccess(roomId as string, user.id);

    if (!hasAccess) {
      return apiError("Vous n'avez pas accès à cette salle", ApiErrorCodes.FORBIDDEN, 403);
    }

    const supabase = await createClient();

    // Vérifier si l'utilisateur est présent dans la salle
    const { data: isParticipant } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (!isParticipant) {
      return apiError(
        'Vous devez être présent dans la salle pour envoyer un message',
        ApiErrorCodes.FORBIDDEN,
        403
      );
    }

    // Envoyer le message
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        user_id: user.id,
        content: body.content,
        created_at: new Date().toISOString(),
      })
      .select(
        `
        id, 
        content, 
        created_at, 
        user_id,
        users (id, display_name, avatar_url)
      `
      )
      .single();

    if (error) throw error;

    return apiSuccess(data, 201);
  } catch (error) {
    return handleSupabaseError(error);
  }
});
