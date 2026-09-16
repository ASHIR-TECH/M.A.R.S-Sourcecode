import { VerificationResult } from './types';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

export async function verifyDonation(txRef: string): Promise<VerificationResult> {
  if (!BACKEND_URL) {
    return { verified: false, message: 'Donation verification is not configured yet.' };
  }

  try {
    const response = await fetch(`${BACKEND_URL}/verify-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txRef }),
    });

    if (!response.ok) {
      return { verified: false, message: 'Could not verify transaction. Please contact support.' };
    }

    return (await response.json()) as VerificationResult;
  } catch {
    return { verified: false, message: 'Could not verify transaction. Please contact support.' };
  }
}