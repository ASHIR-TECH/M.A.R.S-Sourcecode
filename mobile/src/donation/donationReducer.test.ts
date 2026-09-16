import { donationReducer, initialDonationState } from './donationReducer';

describe('donationReducer', () => {
  it('opens checkout', () => {
    const next = donationReducer(initialDonationState, { type: 'OPEN_CHECKOUT' });
    expect(next.status).toBe('checkout_open');
  });

  it('moves to verifying on checkout success', () => {
    const open = { status: 'checkout_open' as const, errorMessage: null };
    const next = donationReducer(open, { type: 'CHECKOUT_CLOSED_SUCCESS' });
    expect(next.status).toBe('verifying');
  });

  it('returns to idle on cancellation, no error shown', () => {
    const open = { status: 'checkout_open' as const, errorMessage: null };
    const next = donationReducer(open, { type: 'CHECKOUT_CLOSED_CANCELLED' });
    expect(next.status).toBe('idle');
    expect(next.errorMessage).toBeNull();
  });

  it('moves to success on verification success', () => {
    const verifying = { status: 'verifying' as const, errorMessage: null };
    const next = donationReducer(verifying, { type: 'VERIFICATION_SUCCEEDED' });
    expect(next.status).toBe('success');
  });

  it('moves to failed with a message on verification failure', () => {
    const verifying = { status: 'verifying' as const, errorMessage: null };
    const next = donationReducer(verifying, { type: 'VERIFICATION_FAILED', message: 'no match' });
    expect(next.status).toBe('failed');
    expect(next.errorMessage).toBe('no match');
  });

  it('resets to idle', () => {
    const success = { status: 'success' as const, errorMessage: null };
    const next = donationReducer(success, { type: 'RESET' });
    expect(next).toEqual(initialDonationState);
  });
});