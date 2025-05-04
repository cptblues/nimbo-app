import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/lib/auth-api';
import { apiSuccess, apiError, handleSupabaseError, ApiErrorCodes } from '@/lib/api-utils';

// GET /api/users/search - Recherche d'utilisateurs (pour invitations)
export const GET = withAuth(async (req, ctx, user) => {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);

    // Le terme de recherche est obligatoire
    const query = url.searchParams.get('query');

    if (!query || query.length < 2) {
      return apiError(
        'Le terme de recherche doit contenir au moins 2 caractères',
        ApiErrorCodes.VALIDATION,
        400
      );
    }

    // Paramètre optionnel: ID du workspace pour exclure les membres existants
    const workspaceId = url.searchParams.get('workspaceId');

    // Recherche des utilisateurs correspondant au critère
    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, email')
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .neq('id', user.id) // Exclure l'utilisateur actuel
      .limit(10);

    if (error) throw error;

    // Si un workspace est spécifié, filtrer les utilisateurs qui en sont déjà membres
    if (workspaceId && data && data.length > 0) {
      // Récupérer les membres existants du workspace
      const { data: existingMembers, error: membersError } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId);

      if (membersError) throw membersError;

      // Récupérer le propriétaire du workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();

      if (workspaceError && workspaceError.code !== 'PGRST116') throw workspaceError;

      // Filtrer les utilisateurs qui sont déjà membres ou propriétaire
      const existingMemberIds = existingMembers?.map(m => m.user_id) || [];
      const ownerId = workspace?.owner_id;

      const filteredUsers = data.filter(user => {
        return !existingMemberIds.includes(user.id) && user.id !== ownerId;
      });

      return apiSuccess(filteredUsers);
    }

    return apiSuccess(data || []);
  } catch (error) {
    return handleSupabaseError(error);
  }
});
