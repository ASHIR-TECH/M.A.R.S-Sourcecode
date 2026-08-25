export type AuthProviderName = 'google' | 'github';

export interface AuthResult {
  idToken: string;
  provider: AuthProviderName;
  email?: string;
  fullName?: string;
}

export interface AuthProvider {
  signIn(): Promise<AuthResult>;
}

/** Thrown when the user closes the OAuth flow themselves — not a real error. */
export class AuthCancelledError extends Error {
  constructor() {
    super('Authentication was cancelled by the user.');
    this.name = 'AuthCancelledError';
  }
}
