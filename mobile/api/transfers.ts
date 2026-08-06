import { apiFetch, encodePathParam } from './client';
import type { Transfer, TransferDetail, TransferStatusResponse } from './types';

/** GET /api/v1/transfers — default: last 20 transfers. */
export function listTransfers(limit = 20): Promise<Transfer[]> {
  return apiFetch<Transfer[]>(`/api/v1/transfers?limit=${encodeURIComponent(String(limit))}`);
}

/** GET /api/v1/transfers/{id} — full transfer detail. */
export function getTransfer(id: string): Promise<TransferDetail> {
  return apiFetch<TransferDetail>(`/api/v1/transfers/${encodePathParam(id)}`);
}

/** GET /api/v1/transfers/{id}/status — live status for in-progress items. */
export function getTransferStatus(id: string): Promise<TransferStatusResponse> {
  return apiFetch<TransferStatusResponse>(`/api/v1/transfers/${encodePathParam(id)}/status`);
}
