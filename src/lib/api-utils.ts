import { NextResponse } from 'next/server';

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
};

// Fonction pour créer une réponse d'API réussie
export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

// Fonction pour créer une réponse d'API en erreur
export function apiError(
  message: string,
  code = 'ERR_UNKNOWN',
  status = 400,
  details?: any
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  );
}

// Codes d'erreur communs
export const ApiErrorCodes = {
  UNAUTHORIZED: 'ERR_UNAUTHORIZED',
  NOT_FOUND: 'ERR_NOT_FOUND',
  VALIDATION: 'ERR_VALIDATION',
  DATABASE: 'ERR_DATABASE',
  FORBIDDEN: 'ERR_FORBIDDEN',
  INTERNAL: 'ERR_INTERNAL',
  DUPLICATE: 'ERR_DUPLICATE',
  FOREIGN_KEY: 'ERR_FOREIGN_KEY',
  EXPIRED: 'ERR_EXPIRED',
  INVALID_STATE: 'ERR_INVALID_STATE',
} as const;

// Types des codes d'erreur pour le type checking
export type ApiErrorCode = (typeof ApiErrorCodes)[keyof typeof ApiErrorCodes];

// Fonction pour gérer les erreurs Supabase et retourner des réponses cohérentes
export function handleSupabaseError(error: any): NextResponse<ApiResponse> {
  console.error('Supabase error:', error);

  // Déterminer le type d'erreur
  let status = 500;
  let code: ApiErrorCode = ApiErrorCodes.INTERNAL;
  let message = 'Une erreur interne est survenue';

  if (error.code === '23505') {
    // Violation de contrainte unique
    status = 409;
    code = ApiErrorCodes.DUPLICATE;
    message = 'Une ressource avec ces données existe déjà';
  } else if (error.code === '42501') {
    // Violation de politique RLS
    status = 403;
    code = ApiErrorCodes.FORBIDDEN;
    message = "Vous n'avez pas les permissions nécessaires pour cette action";
  } else if (error.code === '23503') {
    // Violation de contrainte de clé étrangère
    status = 400;
    code = ApiErrorCodes.FOREIGN_KEY;
    message = "La référence fournie n'existe pas";
  } else if (error.message?.includes('not found')) {
    status = 404;
    code = ApiErrorCodes.NOT_FOUND;
    message = "La ressource demandée n'existe pas";
  }

  return apiError(message, code, status, { originalError: error.message });
}
