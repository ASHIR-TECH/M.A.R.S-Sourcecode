import { apiFetch } from './client';
import type { HealthStatus } from './types';

/**
 * Connection test and readiness check. These endpoints are exempt from
 * Bearer auth on the desktop peer, but we pass the token anyway when present.
 *
 * `baseOverride` lets the Settings screen test a URL before it is saved.
 */
export async function getHealth(baseOverride?: string): Promise<HealthStatus> {
  return await apiFetch<HealthStatus>('/api/v1/health', { baseUrl: baseOverride });
}

export async function getReady(baseOverride?: string): Promise<HealthStatus> {
  return await apiFetch<HealthStatus>('/api/v1/health/ready', { baseUrl: baseOverride });
}

/**
 * Validates a token against a peer before it is persisted. Sends the given
 * token as a Bearer token to /health/ready; a 401 surfaces as AppError(AUTH).
 */
export async function checkReady(baseUrl: string, token: string): Promise<HealthStatus> {
  return await apiFetch<HealthStatus>('/api/v1/health/ready', { baseUrl, token });
}
