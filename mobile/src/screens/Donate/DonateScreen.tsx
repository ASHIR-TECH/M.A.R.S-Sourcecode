import React, { useReducer, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PayWithFlutterwave } from 'flutterwave-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { generateTxRef } from '../../donation/generateTxRef';
import { verifyDonation } from '../../donation/donationApi';
import { donationReducer, initialDonationState } from '../../donation/donationReducer';
import { AmountChip } from '../../components/AmountChip';
import { DonationSuccessView } from './DonationSuccessView';
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

function formatAmount(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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

  const parsedCustom = parseFloat(customAmount);
  const finalAmount = customAmount ? parsedCustom : selectedAmount;
  const symbol = FLUTTERWAVE_SYMBOLS[currency];

  const notConfigured = !FLUTTERWAVE_PUBLIC_KEY;

  const handleDonatePress = () => {
    if (!finalAmount || finalAmount <= 0) return;
    setTxRef(generateTxRef());
    dispatch({ type: 'OPEN_CHECKOUT' });
  };

  const handleCurrencyChange = (next: Currency) => {
    if (next === currency) return;
    setCurrency(next);
    setSelectedAmount(PRESET_AMOUNTS[next][0]);
    setCustomAmount('');
  };

  const handleRedirect = async (data: RedirectParams) => {
    if (data.status !== 'successful') {
      dispatch({ type: 'CHECKOUT_CLOSED_CANCELLED' });
      return;
    }

    dispatch({ type: 'CHECKOUT_CLOSED_SUCCESS' });
    const result = await verifyDonation(data.tx_ref);

    if (result.verified) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      dispatch({ type: 'VERIFICATION_SUCCEEDED' });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      dispatch({ type: 'VERIFICATION_FAILED', message: result.message ?? 'Verification failed.' });
    }
  };

  const resetAndClose = () => {
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
            style={({ pressed }) => [styles.donateButton, (!finalAmount || notConfigured) && styles.donateButtonDisabled, pressed && styles.donateButtonPressed]}
            onPress={handleDonatePress}
            disabled={!finalAmount || notConfigured || state.status === 'verifying'}
            accessibilityRole="button"
            accessibilityLabel={`Donate ${symbol}${finalAmount || 0}`}
          >
            <Text style={styles.donateButtonText}>
              {state.status === 'verifying' ? 'Verifying…' : `Donate ${symbol}${finalAmount || 0}`}
            </Text>
          </Pressable>

          {state.status === 'checkout_open' && (
            <PayWithFlutterwave
              options={{
                tx_ref: txRef,
                authorization: FLUTTERWAVE_PUBLIC_KEY,
                customer: {
                  email: session?.email ?? 'donor@example.com',
                  name: session?.fullName ?? 'Anonymous Donor',
                },
                amount: finalAmount,
                currency,
                payment_options: 'card,mobilemoney,ussd,banktransfer',
              }}
              customButton={() => null}
              onRedirect={handleRedirect}
              onInitializeError={({ message }) => dispatch({ type: 'VERIFICATION_FAILED', message: message || 'Checkout failed to open.' })}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}