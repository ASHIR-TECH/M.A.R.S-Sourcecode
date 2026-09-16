export interface DonationRequest {
  amount: number;
  currency: string;
  txRef: string;
  donorEmail?: string;
  donorName?: string;
}

export interface VerificationResult {
  verified: boolean;
  amount?: number;
  currency?: string;
  txRef?: string;
  message?: string;
}