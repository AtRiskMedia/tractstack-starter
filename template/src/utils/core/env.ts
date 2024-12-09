// src/utils/core/env.ts
export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvValidationError";
  }
}

export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateNonEmptyString(value: unknown, varName: string): string | null {
  if (!value || typeof value !== "string" || value.trim() === "") {
    return `${varName} must be a non-empty string`;
  }
  return null;
}

function validateTursoUrl(value: unknown): string | null {
  const error = validateNonEmptyString(value, "PRIVATE_TURSO_DATABASE_URL");
  if (error) return error;

  const url = value as string;
  if (!url.startsWith("libsql:")) {
    return 'PRIVATE_TURSO_DATABASE_URL must start with "libsql:"';
  }
  return null;
}

function validateTursoToken(value: unknown): string | null {
  const error = validateNonEmptyString(value, "PRIVATE_TURSO_AUTH_TOKEN");
  if (error) return error;

  const token = value as string;
  if (!token.startsWith("ey")) {
    return 'PRIVATE_TURSO_AUTH_TOKEN must start with "ey"';
  }
  return null;
}

export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];

  const hasTursoUrl = !!import.meta.env.PRIVATE_TURSO_DATABASE_URL;
  const hasTursoToken = !!import.meta.env.PRIVATE_TURSO_AUTH_TOKEN;

  if (hasTursoUrl || hasTursoToken) {
    const urlError = validateTursoUrl(import.meta.env.PRIVATE_TURSO_DATABASE_URL);
    const tokenError = validateTursoToken(import.meta.env.PRIVATE_TURSO_AUTH_TOKEN);

    if (urlError) errors.push(urlError);
    if (tokenError) errors.push(tokenError);
  }

  if (import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY) {
    const apiKeyError = validateNonEmptyString(
      import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY,
      "PRIVATE_ASSEMBLYAI_API_KEY"
    );
    if (apiKeyError) errors.push(apiKeyError);
  }

  if (import.meta.env.PRIVATE_ADMIN_PASSWORD) {
    const adminError = validateNonEmptyString(
      import.meta.env.PRIVATE_ADMIN_PASSWORD,
      "PRIVATE_ADMIN_PASSWORD"
    );
    if (adminError) errors.push(adminError);
  }

  if (import.meta.env.PRIVATE_EDITOR_PASSWORD) {
    const editorError = validateNonEmptyString(
      import.meta.env.PRIVATE_EDITOR_PASSWORD,
      "PRIVATE_EDITOR_PASSWORD"
    );
    if (editorError) errors.push(editorError);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
