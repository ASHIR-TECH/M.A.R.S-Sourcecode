import React, { useReducer, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, Modal, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import { FlutterwaveInit } from 'flutterwave-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { generateTxRef } from '../../donation/generateTxRef';
import { verifyDonation } from '../../donation/donationApi';
import { donationReducer, initialDonationState } from '../../donation/donationReducer';
import { AmountChip } from '../../components/AmountChip';
import { DonationSuccessView } from './DonationSuccessView';
import { colors } from '../../theme/colors';
import { styles } from './DonateScreen.styles';

interface RedirectParams {
  status: 'successful' | 'cancelled';
  transaction_id?: string;
  tx_ref: string;
}

type Currency = 'USD' | 'NGN';

const PRESET_AMOUNTS: Record<Currency, number[]> = {
  USD: [100, 250, 350, 500],
  NGN: [30000, 50000, 70000, 100000],
};
const CURRENCIES: Currency[] = ['USD', 'NGN'];
const FLUTTERWAVE_PUBLIC_KEY = process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY ?? '';
const FLUTTERWAVE_SYMBOLS: Record<string, string> = { USD: '$', NGN: '₦' };
const FLUTTERWAVE_REDIRECT_URL = 'https://flutterwave.com/rn-redirect';
const FLUTTERWAVE_REDIRECT_PATTERN = /flutterwave\.com\/rn-redirect/;

function formatAmount(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function parseRedirectParams(url: string): Record<string, string> {
  const query = url.split('?')[1] ?? '';
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    if (eq === -1) {
      params[pair] = '';
    } else {
      params[pair.slice(0, eq)] = decodeURIComponent(pair.slice(eq + 1)).trim();
    }
  }
  return params;
}

interface DonateScreenProps {
  onClose: () => void;
}

export function DonateScreen({ onClose }: DonateScreenProps) {
  const { session } = useAuthStore();
  const [state, dispatch] = useReducer(donationReducer, initialDonationState);
  const [selectedAmount, setSelectedAmount] = useState<number>(PRESET_AMOUNTS.USD[0]);
  const [customAmount, setCustomAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [txRef, setTxRef] = useState('');
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const redirectHandledRef = useRef(false);

  const parsedCustom = parseFloat(customAmount);
  const finalAmount = customAmount ? parsedCustom : selectedAmount;
  const symbol = FLUTTERWAVE_SYMBOLS[currency];

  const notConfigured = !FLUTTERWAVE_PUBLIC_KEY;

  const handleDonatePress = async () => {
    if (!finalAmount || finalAmount <= 0 || notConfigured) return;
    if (state.status === 'checkout_open' || state.status === 'verifying') return;

    const reference = generateTxRef();
    setTxRef(reference);
    redirectHandledRef.current = false;
    dispatch({ type: 'OPEN_CHECKOUT' });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const link = await FlutterwaveInit(
        {
          authorization: FLUTTERWAVE_PUBLIC_KEY,
          tx_ref: reference,
          amount: finalAmount,
          currency,
          payment_options: 'card,mobilemoney,ussd,banktransfer',
          redirect_url: FLUTTERWAVE_REDIRECT_URL,
          customer: {
            email: session?.email ?? 'donor@example.com',
            name: session?.fullName ?? 'Anonymous Donor',
          },
        },
        controller
      );
      setPaymentLink(link);
      setCheckoutVisible(true);
    } catch (error) {
      if (/aborterror/i.test((error as { code?: string })?.code ?? '')) return;
      dispatch({
        type: 'VERIFICATION_FAILED',
        message: (error as { message?: string })?.message || 'Checkout failed to open.',
      });
    }
  };

  const handleCurrencyChange = (next: Currency) => {
    if (next === currency) return;
    setCurrency(next);
    setSelectedAmount(PRESET_AMOUNTS[next][0]);
    setCustomAmount('');
  };

  const closeCheckout = () => {
    setCheckoutVisible(false);
    setPaymentLink(null);
  };

  const handleAbort = () => {
    closeCheckout();
    dispatch({ type: 'CHECKOUT_CLOSED_CANCELLED' });
  };

  const handleRedirect = async (data: RedirectParams) => {
    closeCheckout();

    if (data.status !== 'successful') {
      dispatch({ type: 'CHECKOUT_CLOSED_CANCELLED' });
      return;
    }

    dispatch({ type: 'CHECKOUT_CLOSED_SUCCESS' });
    const result = await verifyDonation(data.tx_ref ?? txRef);

    if (result.verified) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      dispatch({ type: 'VERIFICATION_SUCCEEDED' });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      dispatch({ type: 'VERIFICATION_FAILED', message: result.message ?? 'Verification failed.' });
    }
  };

  const handleCheckoutUrl = (url: string): boolean => {
    if (!FLUTTERWAVE_REDIRECT_PATTERN.test(url)) return true;
    if (redirectHandledRef.current) return false;
    redirectHandledRef.current = true;
    const params = parseRedirectParams(url);
    void handleRedirect({
      status: (params.status ?? 'cancelled') as RedirectParams['status'],
      tx_ref: params.tx_ref,
      transaction_id: params.transaction_id,
    });
    return false;
  };

  const resetAndClose = () => {
    abortRef.current?.abort();
    closeCheckout();
    dispatch({ type: 'RESET' });
    onClose();
  };

  if (state.status === 'success') {
    return <DonationSuccessView amount={finalAmount} currency={symbol} txRef={txRef} onDone={resetAndClose} />;
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={resetAndClose} accessibilityLabel="Close donate">
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <Text style={styles.kicker}>SUPPORT THE DEVELOPER</Text>
          <Text style={styles.title}>DONATE</Text>
          <Text style={styles.subtitle}>This is the work of a solo developer, kindly help to keep it updated.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>Choose an amount</Text>
          <View style={styles.chipRow}>
            {PRESET_AMOUNTS[currency].map((amt) => (
              <AmountChip
                key={amt}
                label={`${symbol}${formatAmount(amt)}`}
                active={!customAmount && selectedAmount === amt}
                onPress={() => {
                  setSelectedAmount(amt);
                  setCustomAmount('');
                }}
                style={styles.amountChip}
              />
            ))}
          </View>

          <TextInput
            value={customAmount}
            onChangeText={setCustomAmount}
            placeholder={`Custom amount (${currency})`}
            placeholderTextColor="#8A7A68"
            keyboardType="numeric"
            style={styles.customInput}
            accessibilityLabel="Custom amount"
          />

          <Text style={styles.sectionLabel}>Currency</Text>
          <View style={styles.chipRow}>
            {CURRENCIES.map((cur) => (
              <AmountChip
                key={cur}
                label={cur}
                active={currency === cur}
                onPress={() => handleCurrencyChange(cur)}
              />
            ))}
          </View>

          {notConfigured && (
            <Text style={styles.errorText} accessibilityRole="alert">
              Donations are not configured yet — the developer has not added a Flutterwave public key.
            </Text>
          )}

          {state.status === 'failed' && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {state.errorMessage}
            </Text>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.donateButton,
              (!finalAmount || notConfigured || state.status === 'checkout_open' || state.status === 'verifying') &&
                styles.donateButtonDisabled,
              pressed && styles.donateButtonPressed,
            ]}
            onPress={handleDonatePress}
            disabled={!finalAmount || notConfigured || state.status === 'checkout_open' || state.status === 'verifying'}
            accessibilityRole="button"
            accessibilityLabel={`Donate ${symbol}${finalAmount || 0}`}
          >
            <Text style={styles.donateButtonText}>
              {state.status === 'verifying'
                ? 'Verifying…'
                : state.status === 'checkout_open'
                  ? 'Opening checkout…'
                  : `Donate ${symbol}${finalAmount || 0}`}
            </Text>
          </Pressable>
        </ScrollView>

        <Modal
          visible={checkoutVisible}
          animationType="slide"
          onRequestClose={handleAbort}
          statusBarTranslucent
        >
          <View style={styles.checkoutModal}>
            <View style={styles.checkoutHeader}>
              <Text style={styles.checkoutTitle}>Complete your donation</Text>
              <Pressable
                style={styles.checkoutClose}
                onPress={handleAbort}
                accessibilityLabel="Cancel payment"
                hitSlop={12}
              >
                <Text style={styles.checkoutCloseText}>✕</Text>
              </Pressable>
            </View>
            {paymentLink ? (
              <WebView
                source={{ uri: paymentLink }}
                onShouldStartLoadWithRequest={(event) => handleCheckoutUrl(event.url)}
                onNavigationStateChange={(navState) => {
                  if (!navState.loading) handleCheckoutUrl(navState.url);
                }}
                startInLoadingState
                style={styles.checkoutWebView}
              />
            ) : (
              <ActivityIndicator color={colors.accent} size="large" style={styles.checkoutLoading} />
            )}
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}