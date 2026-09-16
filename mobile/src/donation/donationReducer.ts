export type DonationStatus = 'idle' | 'checkout_open' | 'verifying' | 'success' | 'failed';

export interface DonationState {
  status: DonationStatus;
  errorMessage: string | null;
}

export type DonationAction =
  | { type: 'OPEN_CHECKOUT' }
  | { type: 'CHECKOUT_CLOSED_SUCCESS' }
  | { type: 'CHECKOUT_CLOSED_CANCELLED' }
  | { type: 'VERIFICATION_SUCCEEDED' }
  | { type: 'VERIFICATION_FAILED'; message: string }
  | { type: 'RESET' };

export const initialDonationState: DonationState = { status: 'idle', errorMessage: null };

export function donationReducer(state: DonationState, action: DonationAction): DonationState {
  switch (action.type) {
    case 'OPEN_CHECKOUT':
      return { status: 'checkout_open', errorMessage: null };
    case 'CHECKOUT_CLOSED_SUCCESS':
      return { status: 'verifying', errorMessage: null };
    case 'CHECKOUT_CLOSED_CANCELLED':
      return { status: 'idle', errorMessage: null };
    case 'VERIFICATION_SUCCEEDED':
      return { status: 'success', errorMessage: null };
    case 'VERIFICATION_FAILED':
      return { status: 'failed', errorMessage: action.message };
    case 'RESET':
      return initialDonationState;
    default:
      return state;
  }
}