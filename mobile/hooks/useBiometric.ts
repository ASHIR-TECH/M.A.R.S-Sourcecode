import { useCallback, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '@/contexts/AuthContext';

interface UseBiometricResult {
  /** Whether the device has biometric hardware with enrolled identities. */
  isAvailable: boolean;
  /** Whether the app requires biometric unlock. */
  enabled: boolean;
  /** True while a prompt is showing. */
  checking: boolean;
  toggle: () => Promise<void>;
  /** Prompt for biometrics; returns true only when the user authenticates. */
  authenticate: () => Promise<boolean>;
}

/**
 * Wraps expo-local-authentication. `enabled` is a persisted preference;
 * `authenticate` gates app content (Face ID / Touch ID / fingerprint).
 */
export function useBiometric(): UseBiometricResult {
  const { biometricEnabled, setBiometricEnabled } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [hasHardware, enrolled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        if (active) setIsAvailable(Boolean(hasHardware) && Boolean(enrolled));
      } catch {
        // biometrics unsupported — leave isAvailable false
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const authenticate = useCallback(async () => {
    if (!isAvailable) return true;
    setChecking(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock MARS',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch {
      return false;
    } finally {
      setChecking(false);
    }
  }, [isAvailable]);

  const toggle = useCallback(async () => {
    if (!isAvailable) return;
    if (biometricEnabled) {
      await setBiometricEnabled(false);
      return;
    }
    const success = await authenticate();
    if (success) {
      await setBiometricEnabled(true);
    }
  }, [isAvailable, biometricEnabled, authenticate, setBiometricEnabled]);

  return { isAvailable, enabled: biometricEnabled, checking, toggle, authenticate };
}
