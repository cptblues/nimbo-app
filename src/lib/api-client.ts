/**
 * Client API pour effectuer des requêtes authentifiées
 */
export async function fetchWithAuth(url: string, options?: RequestInit): Promise<any> {
  try {
    const fetchOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include', // Inclure les cookies pour l'authentification
    };

    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erreur lors de la requête API:', error);
    return {
      success: false,
      error: {
        message: 'Erreur de connexion au serveur',
        code: 'ERR_CONNECTION',
      },
    };
  }
}
