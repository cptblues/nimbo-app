import { apiError, ApiErrorCodes } from './api-utils';
import { NextResponse } from 'next/server';

// Type pour les règles de validation
type ValidationRules = {
  [key: string]: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    isUUID?: boolean;
    enum?: string[];
    isDate?: boolean;
    custom?: (value: any) => boolean | string;
  };
};

// Fonction pour valider les données selon les règles définies
export function validateData(data: any, rules: ValidationRules) {
  const errors: { [key: string]: string } = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    // Vérifier si le champ est requis
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors[field] = `Le champ ${field} est requis`;
      continue;
    }

    // Si le champ est optionnel et n'est pas fourni, passer à la validation suivante
    if ((value === undefined || value === null || value === '') && !rule.required) {
      continue;
    }

    // Validation de longueur minimale pour les chaînes
    if (
      rule.minLength !== undefined &&
      typeof value === 'string' &&
      value.length < rule.minLength
    ) {
      errors[field] = `Le champ ${field} doit contenir au moins ${rule.minLength} caractères`;
    }

    // Validation de longueur maximale pour les chaînes
    if (
      rule.maxLength !== undefined &&
      typeof value === 'string' &&
      value.length > rule.maxLength
    ) {
      errors[field] = `Le champ ${field} doit contenir au maximum ${rule.maxLength} caractères`;
    }

    // Validation de motif (regex)
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors[field] = `Le champ ${field} ne respecte pas le format attendu`;
    }

    // Validation UUID
    if (
      rule.isUUID &&
      typeof value === 'string' &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ) {
      errors[field] = `Le champ ${field} doit être un UUID valide`;
    }

    // Validation enum
    if (rule.enum && !rule.enum.includes(value)) {
      errors[field] =
        `Le champ ${field} doit être l'une des valeurs suivantes: ${rule.enum.join(', ')}`;
    }

    // Validation de date
    if (rule.isDate) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        errors[field] = `Le champ ${field} doit être une date valide`;
      }
    }

    // Validation personnalisée
    if (rule.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        errors[field] = typeof result === 'string' ? result : `Le champ ${field} est invalide`;
      }
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

// Fonction pour valider les données et retourner une erreur API si nécessaire
export function validateRequest(data: any, rules: ValidationRules): NextResponse | null {
  const errors = validateData(data, rules);

  if (errors) {
    return apiError('Les données fournies ne sont pas valides', ApiErrorCodes.VALIDATION, 400, {
      errors,
    });
  }

  return null;
}
