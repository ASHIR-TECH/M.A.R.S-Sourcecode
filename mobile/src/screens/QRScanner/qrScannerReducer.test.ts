import { qrScannerReducer, initialScanState } from './qrScannerReducer';

describe('qrScannerReducer', () => {
  it('moves to validating on CODE_DETECTED', () => {
    const next = qrScannerReducer(initialScanState, { type: 'CODE_DETECTED' });
    expect(next.status).toBe('validating');
    expect(next.error).toBeNull();
  });

  it('moves to success on VALIDATION_SUCCEEDED', () => {
    const validating = { status: 'validating' as const, error: null };
    const next = qrScannerReducer(validating, { type: 'VALIDATION_SUCCEEDED' });
    expect(next.status).toBe('success');
  });

  it('moves to error and stores the error on VALIDATION_FAILED', () => {
    const validating = { status: 'validating' as const, error: null };
    const error = { reason: 'expired' as const, message: 'expired' };
    const next = qrScannerReducer(validating, { type: 'VALIDATION_FAILED', error });
    expect(next.status).toBe('error');
    expect(next.error).toEqual(error);
  });

  it('returns to scanning on RESUME_SCANNING', () => {
    const errored = { status: 'error' as const, error: { reason: 'expired' as const, message: 'x' } };
    const next = qrScannerReducer(errored, { type: 'RESUME_SCANNING' });
    expect(next.status).toBe('scanning');
    expect(next.error).toBeNull();
  });

  it('ignores unknown actions', () => {
    const next = qrScannerReducer(initialScanState, { type: 'UNKNOWN' } as any);
    expect(next).toEqual(initialScanState);
  });
});