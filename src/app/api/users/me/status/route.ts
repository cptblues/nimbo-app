import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/lib/auth-api';
import { apiSuccess, handleSupabaseError } from '@/lib/api-utils';
import { validateRequest } from '@/lib/validation';

// PUT /api/users/me/status - Mettre à jour le statut utilisateur
export const PUT = withAuth(async (req, ctx, user) => {
  try {
    const body = await req.json();

    // Valider les données
    const validationError = validateRequest(body, {
      status: { enum: ['online', 'busy', 'away', 'offline'] },
      status_message: { maxLength: 100 },
    });

    if (validationError) return validationError;

    const supabase = await createClient();

    // Mettre à jour le statut utilisateur
    const { data, error } = await supabase
      .from('users')
      .update({
        ...(body.status !== undefined && { status: body.status }),
        ...(body.status_message !== undefined && { status_message: body.status_message }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, display_name, avatar_url, status, status_message')
      .single();

    if (error) throw error;

    return apiSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
});
