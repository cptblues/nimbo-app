import { createClient } from '@/utils/supabase/server';
import { withAuth } from '@/lib/auth-api';
import { apiSuccess, handleSupabaseError } from '@/lib/api-utils';

// GET /api/users - Liste d'utilisateurs (pour admin uniquement)
// Cette API pourrait être restreinte aux administrateurs du système dans une future implémentation
export const GET = withAuth(async req => {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);

    // Paramètres de pagination
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20'), 50); // Max 50 utilisateurs par page
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Paramètres de filtre
    const query = url.searchParams.get('query') || '';

    // Construction de la requête
    let usersQuery = supabase
      .from('users')
      .select('id, display_name, avatar_url, email, created_at', { count: 'exact' });

    // Appliquer la recherche si un terme est fourni
    if (query) {
      usersQuery = usersQuery.or(`display_name.ilike.%${query}%,email.ilike.%${query}%`);
    }

    // Appliquer la pagination
    usersQuery = usersQuery.range(from, to);

    // Exécuter la requête
    const { data, count, error } = await usersQuery;

    if (error) throw error;

    return apiSuccess({
      users: data || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: count ? Math.ceil(count / pageSize) : 0,
      },
    });
  } catch (error) {
    return handleSupabaseError(error);
  }
});
