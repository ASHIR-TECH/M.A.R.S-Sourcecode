export interface PairingPayload {
  version: 1;
  desktopId: string;
  desktopName: string;
  pairingToken: string;
  issuedAt: string;
  expiresAt: string;
  relayUrl: string;
}

export type PairingErrorReason = 'malformed' | 'invalid_schema' | 'expired' | 'unsupported_version';

export interface PairingError {
  reason: PairingErrorReason;
  message: string;
}