import { PairingError } from '../../pairing/types';

export type ScanStatus = 'scanning' | 'validating' | 'success' | 'error';

export interface ScanState {
  status: ScanStatus;
  error: PairingError | null;
}

export type ScanAction =
  | { type: 'CODE_DETECTED' }
  | { type: 'VALIDATION_SUCCEEDED' }
  | { type: 'VALIDATION_FAILED'; error: PairingError }
  | { type: 'RESUME_SCANNING' };

export const initialScanState: ScanState = { status: 'scanning', error: null };

/**
 * Screen-local scan state machine (PHASE_5 §2.4):
 * scanning → validating → success, or error → (auto) scanning.
 */
export function qrScannerReducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    case 'CODE_DETECTED':
      return { status: 'validating', error: null };
    case 'VALIDATION_SUCCEEDED':
      return { status: 'success', error: null };
    case 'VALIDATION_FAILED':
      return { status: 'error', error: action.error };
    case 'RESUME_SCANNING':
      return { status: 'scanning', error: null };
    default:
      return state;
  }
}