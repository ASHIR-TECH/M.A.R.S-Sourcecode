import { apiFetch } from './client';
import type { Session } from './types';

/** GET /api/v1/sessions — active peer sessions. */
export function listSessions(): Promise<Session[]> {
  return apiFetch<Session[]>('/api/v1/sessions');
}
