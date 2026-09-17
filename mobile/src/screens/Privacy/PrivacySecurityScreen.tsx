import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SettingsSection } from '../../components/SettingsSection';
import { SettingsRow } from '../../components/SettingsRow';
import { useTabBarVisibility } from '../../navigation/TabBarVisibility';
import { isAtBottom } from '../../navigation/scrollBottom';
import { LegalDocumentScreen } from './LegalDocumentScreen';
import { PRIVACY_POLICY, TERMS_OF_SERVICE, LegalDocument } from './legalContent';
import { styles } from './PrivacySecurityScreen.styles';

const SUPPORT_MAILTO = 'mailto:ashir.support.mail@gmail.com?subject=MARS%20Data%20Deletion%20Request';

function Note({ lead, children }: { lead: string; children: React.ReactNode }) {
  return (
    <Text style={styles.note}>
      <Text style={styles.lead}>{lead} </Text>
      {children}
    </Text>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

interface PrivacySecurityScreenProps {
  onClose: () => void;
}

/**
 * Privacy & Security settings surface (Phase 10): the user-facing disclosure of
 * what the app collects, who processes it, how long it is kept, and the
 * safeguards in place. Reached from Settings → Preferences → Privacy & Security.
 */
export function PrivacySecurityScreen({ onClose }: PrivacySecurityScreenProps) {
  const setTabBarHidden = useTabBarVisibility();
  const [openDocument, setOpenDocument] = useState<LegalDocument | null>(null);
  const layoutHeight = useRef(0);
  const contentHeight = useRef(0);
  const offsetY = useRef(0);

  const syncBarVisibility = useCallback(() => {
    setTabBarHidden(
      !isAtBottom({
        offsetY: offsetY.current,
        layoutHeight: layoutHeight.current,
        contentHeight: contentHeight.current,
      })
    );
  }, [setTabBarHidden]);

  // Hide the bottom bar on entry; restore it when the user reaches the end
  // (and always restore it if this screen is left).
  useEffect(() => {
    setTabBarHidden(true);
    return () => setTabBarHidden(false);
  }, [setTabBarHidden]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    offsetY.current = contentOffset.y;
    layoutHeight.current = layoutMeasurement.height;
    contentHeight.current = contentSize.height;
    syncBarVisibility();
  };

  if (openDocument) {
    return <LegalDocumentScreen document={openDocument} onClose={() => setOpenDocument(null)} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close privacy and security">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.kicker}>SETTINGS</Text>
        <Text style={styles.title}>PRIVACY &amp; SECURITY</Text>
        <Text style={styles.subtitle}>What Mars collects, how it is used, and how it is protected.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        onLayout={(e) => {
          layoutHeight.current = e.nativeEvent.layout.height;
          syncBarVisibility();
        }}
        onContentSizeChange={(_w, h) => {
          contentHeight.current = h;
          syncBarVisibility();
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <SettingsSection title="Data We Collect">
          <Note lead="Account.">When you sign in with Google or GitHub we receive your name, email, and profile photo. We never see or store your password.</Note>
          <Divider />
          <Note lead="Devices.">Paired desktops and their connection status are kept on this device to power the device hub.</Note>
          <Divider />
          <Note lead="Donations.">We record the amount, currency, reference, email, and time of each contribution.</Note>
        </SettingsSection>

        <SettingsSection title="Payments">
          <Note lead="Card details.">Payment details are entered directly with Flutterwave. Mars never receives or stores your card number.</Note>
          <Divider />
          <Note lead="Verification.">Every donation is confirmed on our server before it is shown as successful, so a client app cannot fake a contribution.</Note>
        </SettingsSection>

        <SettingsSection title="How We Use It">
          <Note lead="Purpose.">Your data is used to sign you in, pair your desktops, relay chat, process donations, and respond to support requests.</Note>
          <Divider />
          <Note lead="No sale.">We do not sell your personal data or use it for advertising.</Note>
        </SettingsSection>

        <SettingsSection title="Retention & Deletion">
          <Note lead="Retention.">Donation records are kept for accounting and tax purposes. Other data is kept while your account is active.</Note>
          <Divider />
          <Note lead="Deletion.">You can request deletion of your data at any time using the contact link below.</Note>
        </SettingsSection>

        <SettingsSection title="Third-Party Services">
          <Note lead="Providers.">Google and GitHub provide sign-in, and Flutterwave processes payments. Their own privacy policies govern the data they handle.</Note>
        </SettingsSection>

        <SettingsSection title="Security">
          <Note lead="Sessions.">Sign-in tokens are stored in your device's encrypted keystore, not in plain storage.</Note>
          <Divider />
          <Note lead="Payments.">Donation secrets live only on our server and are never shipped inside the app.</Note>
        </SettingsSection>

        <SettingsSection title="Documents">
          <SettingsRow label="Privacy Policy" onPress={() => setOpenDocument(PRIVACY_POLICY)} />
          <Divider />
          <SettingsRow label="Terms of Service" onPress={() => setOpenDocument(TERMS_OF_SERVICE)} />
          <Divider />
          <SettingsRow label="Request Data Deletion" onPress={() => void Linking.openURL(SUPPORT_MAILTO)} />
        </SettingsSection>
      </ScrollView>
    </View>
  );
}
