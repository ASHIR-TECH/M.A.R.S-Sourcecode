export type ApiErrorKind = 'network' | 'timeout' | 'auth' | 'server' | 'config';

/**
 * Typed failure for the desktop REST layer. Callers branch on `kind` (e.g. a
 * `401` clears the stored token) instead of parsing messages — mirrors the
 * PHASE_14 §"api/client.ts" contract.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}
