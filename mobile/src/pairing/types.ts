export interface PairingPayload {
  version: 1;
  desktopId: string;
  desktopName: string;
  pairingToken: string;
  issuedAt: string;
  expiresAt: string;
  relayUrl: string;
  /**
   * Optional Phase 14 agent REST endpoint. When the desktop includes these in
   * its QR, pairing auto-configures device control — no manual settings entry.
   */
  agentApiUrl?: string;
  agentApiToken?: string;
}

export type PairingErrorReason = 'malformed' | 'invalid_schema' | 'expired' | 'unsupported_version';

export interface PairingError {
  reason: PairingErrorReason;
  message: string;
}