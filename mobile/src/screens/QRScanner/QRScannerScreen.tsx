import React, { useReducer, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { parsePairingPayload, isPairingError } from '../../pairing/parsePairingPayload';
import { usePairingStore } from '../../store/usePairingStore';
import { qrScannerReducer, initialScanState } from './qrScannerReducer';
import { PermissionDeniedView } from './PermissionDeniedView';
import { styles } from './QRScannerScreen.styles';

interface QRScannerScreenProps {
  onPaired: () => void;
  onClose: () => void;
}

const ERROR_RESUME_DELAY_MS = 2000;

export function QRScannerScreen({ onPaired, onClose }: QRScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [state, dispatch] = useReducer(qrScannerReducer, initialScanState);
  const setPairedDesktop = usePairingStore((s) => s.setPairedDesktop);

  // Guards against onBarcodeScanned firing repeatedly for the same code
  // while it remains in frame — see NFR-2.
  const isLockedRef = useRef(false);

  // Breathing text block (loop forever)
  const textPulse = useSharedValue(0);
  useEffect(() => {
    textPulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [textPulse]);

  const textBlockStyle = useAnimatedStyle(() => ({ opacity: 0.6 + 0.4 * textPulse.value }));

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    if (state.status === 'error') {
      const timeout = setTimeout(() => {
        isLockedRef.current = false;
        dispatch({ type: 'RESUME_SCANNING' });
      }, ERROR_RESUME_DELAY_MS);
      return () => clearTimeout(timeout);
    }
  }, [state.status]);

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (isLockedRef.current) return;
      isLockedRef.current = true;
      dispatch({ type: 'CODE_DETECTED' });

      const parsed = parsePairingPayload(result.data);

      if (isPairingError(parsed)) {
        dispatch({ type: 'VALIDATION_FAILED', error: parsed });
        return;
      }

      await setPairedDesktop(parsed);
      dispatch({ type: 'VALIDATION_SUCCEEDED' });
      onPaired();
    },
    [onPaired, setPairedDesktop]
  );

  if (!permission) return null; // permission status still loading
  if (!permission.granted) return <PermissionDeniedView />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>QR SCANNER</Text>
        <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close scanner">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={state.status === 'scanning' ? handleBarcodeScanned : undefined}
      >
        <View style={styles.overlay}>
          <View style={styles.scanTarget} />

          <Animated.View style={[styles.textBlock, textBlockStyle]}>
            <Text style={styles.scanText}>Scan to Connect</Text>
            <Text style={styles.scanSubtitle}>
              Align the station's QR code within the boundaries to establish peer link
            </Text>

            {state.status === 'validating' && <Text style={styles.statusText}>Pairing…</Text>}
            {state.status === 'error' && state.error && (
              <Text style={styles.errorText} accessibilityRole="alert">
                {state.error.message}
              </Text>
            )}
          </Animated.View>
        </View>
      </CameraView>
    </View>
  );
}