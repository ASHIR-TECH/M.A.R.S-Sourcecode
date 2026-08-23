# Phase 2 — Sign In (Google + Apple OAuth)

**Module:** `screens/SignIn`
**Depends on:** Phase 1 (Splash) for entry navigation, Theme constants, `MarsLogo` component
**Blocks:** Home / Command Center screen — session must exist before entering the authenticated stack

---

## 1. Requirements

### 1.1 Functional Requirements
| ID | Requirement |
|----|-------------|
| FR-1 | Screen shows logo, "SIGN IN" title, subtitle copy, a "Continue with Google" button, a "Continue with Apple" button, and a Terms/Privacy footer |
| FR-2 | Tapping "Continue with Google" triggers Google OAuth and, on success, produces an authenticated session |
| FR-3 | Tapping "Continue with Apple" triggers Sign in with Apple and, on success, produces an authenticated session |
| FR-4 | On successful auth, user is navigated to the authenticated stack (Home) |
| FR-5 | "Continue with Apple" is shown only on iOS (Apple guidelines require this — Android/Web should hide or replace it) |
| FR-6 | Auth errors (user cancels, network failure, provider error) show a non-blocking inline error state, not a crash |
| FR-7 | Terms & Privacy Policy links are tappable and open the relevant URLs |
| FR-8 | While an auth request is in flight, both buttons show a loading state and are disabled to prevent double-submission |

### 1.2 Non-Functional Requirements
| ID | Requirement |
|----|-------------|
| NFR-1 | Auth provider logic is fully decoupled from the screen (testable without rendering UI) |
| NFR-2 | No credentials, tokens, or secrets are hardcoded in source |
| NFR-3 | Session token is persisted securely (`expo-secure-store`, not `AsyncStorage`) |
| NFR-4 | Screen is accessible: buttons have proper `accessibilityLabel`/`accessibilityRole` |
| NFR-5 | Works whether or not the relay/backend from later phases exists yet — auth state is mockable |

### 1.3 Out of Scope (deferred)
- Email/password fallback (not in Figma design)
- Account linking / merging multiple providers
- Silent/auto sign-in on relaunch — that belongs to the root navigator's bootstrap logic (`RootNavigator`), consuming `useAuthStore` built here, but the "check on launch and skip splash→login" flow itself is a Phase 3+ concern

---

## 2. Architecture & Design Decisions

### 2.1 Provider abstraction (`authProviders/`)
Google and Apple sign-in are implemented as two independent, interchangeable modules behind a shared interface:

```ts
interface AuthResult {
  idToken: string;
  provider: 'google' | 'apple';
  email?: string;
  fullName?: string;
}

interface AuthProvider {
  signIn(): Promise<AuthResult>;
}
```

This means:
- `SignInScreen.tsx` never imports Google/Apple SDKs directly — it calls `googleAuthProvider.signIn()` / `appleAuthProvider.signIn()`
- Swapping libraries later (e.g. moving from Expo AuthSession to Firebase Auth) touches only the provider file, not the screen
- Each provider is unit-testable by mocking its underlying SDK call in isolation

### 2.2 Why `expo-secure-store` over `AsyncStorage` for the session
`AsyncStorage` is unencrypted plain storage — fine for UI prefs, wrong for auth tokens. `expo-secure-store` uses Keychain (iOS) / Keystore (Android), which is the standard, non-negotiable choice for anything credential-shaped.

### 2.3 State ownership: `useAuthStore` (zustand)
A single store owns: `session`, `status` (`idle | loading | authenticated | error`), `error`. The screen is a thin consumer — it dispatches `signInWithGoogle()` / `signInWithApple()` and reads `status`/`error` to drive its own local button UI. This keeps auth state available app-wide (e.g. for the navigator to decide Auth-stack vs. App-stack) without prop-drilling.

### 2.4 Error handling philosophy
User-cancelled auth (closing the OAuth sheet) is **not** an error state — it should silently reset to idle. Only genuine failures (network, provider rejection, malformed token) surface the inline error banner. This distinction is handled inside each provider module by classifying the thrown error before it reaches the store.

---

## 3. File Structure

```
src/
  auth/
    types.ts                     # AuthResult, AuthProvider interfaces
    googleAuthProvider.ts
    appleAuthProvider.ts
    sessionStorage.ts             # secure-store read/write/clear
  store/
    useAuthStore.ts
  screens/
    SignIn/
      SignInScreen.tsx
      SignInScreen.styles.ts
      SignInScreen.test.tsx
  components/
    buttons/
      OAuthButton.tsx              # shared styled button, icon + label + loading state
  navigation/
    RootNavigator.tsx              # branches on useAuthStore().status
app.json                            # OAuth scheme/config
.env                                 # client IDs (not committed)
```

---

## 4. Dependencies

```bash
npx expo install expo-auth-session expo-crypto expo-web-browser
npx expo install expo-apple-authentication
npx expo install expo-secure-store
npm install zustand
```

> `expo-apple-authentication` only functions on physical iOS devices/iOS simulators — Android builds must guard its usage (see §5.2 and §5.5).

---

## 5. Implementation

### 5.1 Shared types

```ts
// src/auth/types.ts
export type AuthProviderName = 'google' | 'apple';

export interface AuthResult {
  idToken: string;
  provider: AuthProviderName;
  email?: string;
  fullName?: string;
}

export interface AuthProvider {
  signIn(): Promise<AuthResult>;
}

/** Thrown when the user closes the OAuth flow themselves — not a real error. */
export class AuthCancelledError extends Error {
  constructor() {
    super('Authentication was cancelled by the user.');
    this.name = 'AuthCancelledError';
  }
}
```

### 5.2 Google provider

```ts
// src/auth/googleAuthProvider.ts
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { AuthProvider, AuthResult, AuthCancelledError } from './types';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export const googleAuthProvider: AuthProvider = {
  async signIn(): Promise<AuthResult> {
    const redirectUri = AuthSession.makeRedirectUri();

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new AuthCancelledError();
    }

    if (result.type !== 'success' || !result.params.id_token) {
      throw new Error('Google sign-in failed: no ID token returned.');
    }

    return {
      idToken: result.params.id_token,
      provider: 'google',
    };
  },
};
```

### 5.3 Apple provider

```ts
// src/auth/appleAuthProvider.ts
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AuthProvider, AuthResult, AuthCancelledError } from './types';

export const appleAuthProvider: AuthProvider = {
  async signIn(): Promise<AuthResult> {
    if (Platform.OS !== 'ios') {
      throw new Error('Sign in with Apple is only available on iOS.');
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('Apple sign-in failed: no identity token returned.');
      }

      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(' ')
        : undefined;

      return {
        idToken: credential.identityToken,
        provider: 'apple',
        email: credential.email ?? undefined,
        fullName,
      };
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') {
        throw new AuthCancelledError();
      }
      throw err;
    }
  },
};
```

### 5.4 Secure session storage

```ts
// src/auth/sessionStorage.ts
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'mars.session.idToken';

export const sessionStorage = {
  async save(idToken: string): Promise<void> {
    await SecureStore.setItemAsync(SESSION_KEY, idToken);
  },
  async load(): Promise<string | null> {
    return SecureStore.getItemAsync(SESSION_KEY);
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  },
};
```

### 5.5 Auth store

```ts
// src/store/useAuthStore.ts
import { create } from 'zustand';
import { googleAuthProvider } from '../auth/googleAuthProvider';
import { appleAuthProvider } from '../auth/appleAuthProvider';
import { sessionStorage } from '../auth/sessionStorage';
import { AuthCancelledError, AuthResult } from '../auth/types';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

interface AuthState {
  status: AuthStatus;
  session: AuthResult | null;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

async function runSignIn(
  set: (partial: Partial<AuthState>) => void,
  signInFn: () => Promise<AuthResult>
) {
  set({ status: 'loading', error: null });
  try {
    const result = await signInFn();
    await sessionStorage.save(result.idToken);
    set({ status: 'authenticated', session: result, error: null });
  } catch (err) {
    if (err instanceof AuthCancelledError) {
      set({ status: 'idle', error: null });
      return;
    }
    set({
      status: 'error',
      error: err instanceof Error ? err.message : 'Sign-in failed. Please try again.',
    });
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  session: null,
  error: null,

  signInWithGoogle: () => runSignIn(set, googleAuthProvider.signIn),
  signInWithApple: () => runSignIn(set, appleAuthProvider.signIn),

  signOut: async () => {
    await sessionStorage.clear();
    set({ status: 'idle', session: null, error: null });
  },

  restoreSession: async () => {
    const token = await sessionStorage.load();
    if (token) {
      // Session presence implies authenticated; provider identity is not
      // recoverable from a stored token alone without a backend call —
      // that verification belongs to a later "session validation" phase.
      set({ status: 'authenticated' });
    }
  },
}));
```

### 5.6 Shared OAuth button component

```tsx
// src/components/buttons/OAuthButton.tsx
import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { styles } from './OAuthButton.styles';

interface OAuthButtonProps {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function OAuthButton({ label, icon, onPress, loading, disabled }: OAuthButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        (disabled || loading) && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#0B0704" />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
```

```ts
// src/components/buttons/OAuthButton.styles.ts
import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.textPrimary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: '#0B0704',
    fontWeight: '600',
    fontSize: 16,
  },
});
```

### 5.7 The Sign In screen

```tsx
// src/screens/SignIn/SignInScreen.tsx
import React from 'react';
import { View, Text, ImageBackground, Linking, Platform } from 'react-native';
import { MarsLogo } from '../../components/icons/MarsLogo';
import { OAuthButton } from '../../components/buttons/OAuthButton';
import { useAuthStore } from '../../store/useAuthStore';
import { styles } from './SignInScreen.styles';

const TERMS_URL = 'https://example.com/terms';
const PRIVACY_URL = 'https://example.com/privacy';

export function SignInScreen() {
  const { status, error, signInWithGoogle, signInWithApple } = useAuthStore();
  const isLoading = status === 'loading';

  return (
    <ImageBackground
      source={require('../../../assets/images/splash-bg.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <MarsLogo size={72} />
          <Text style={styles.title}>SIGN IN</Text>
          <Text style={styles.subtitle}>
            Choose your preferred method to access the station
          </Text>
        </View>

        <View style={styles.actions}>
          <OAuthButton
            label="Continue with Google"
            icon={<GoogleIcon />}
            onPress={signInWithGoogle}
            loading={isLoading}
          />

          {Platform.OS === 'ios' && (
            <OAuthButton
              label="Continue with Apple"
              icon={<AppleIcon />}
              onPress={signInWithApple}
              loading={isLoading}
            />
          )}

          {error && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {error}
            </Text>
          )}
        </View>

        <Text style={styles.footer}>
          By continuing, you agree to our{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
            Terms
          </Text>{' '}
          &{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
            Privacy Policy
          </Text>
        </Text>
      </View>
    </ImageBackground>
  );
}

// Placeholder icon components — swap for your actual asset SVGs/icon set.
function GoogleIcon() {
  return null;
}
function AppleIcon() {
  return null;
}
```

### 5.8 Styles

```ts
// src/screens/SignIn/SignInScreen.styles.ts
import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const styles = StyleSheet.create({
  background: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xxl,
  },
  title: {
    ...typography.splashTitle,
    fontSize: 28,
    color: colors.textPrimary,
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  actions: {
    gap: spacing.md,
  },
  errorText: {
    color: '#E05A47',
    textAlign: 'center',
    fontSize: 13,
  },
  footer: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  link: {
    color: colors.accent,
    textDecorationLine: 'underline',
  },
});
```

### 5.9 Environment configuration

```
# .env (not committed — add to .gitignore)
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

```json
// app.json (relevant excerpt)
{
  "expo": {
    "ios": {
      "usesAppleSignIn": true,
      "bundleIdentifier": "com.ashir.mars"
    },
    "scheme": "mars"
  }
}
```

---

## 6. Testing

```ts
// src/screens/SignIn/SignInScreen.test.tsx
import { act, renderHook } from '@testing-library/react-hooks';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthCancelledError } from '../../auth/types';

jest.mock('../../auth/googleAuthProvider', () => ({
  googleAuthProvider: { signIn: jest.fn() },
}));
jest.mock('../../auth/sessionStorage', () => ({
  sessionStorage: { save: jest.fn(), load: jest.fn(), clear: jest.fn() },
}));

import { googleAuthProvider } from '../../auth/googleAuthProvider';

describe('useAuthStore.signInWithGoogle', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'idle', session: null, error: null });
    jest.clearAllMocks();
  });

  it('sets status to authenticated on success', async () => {
    (googleAuthProvider.signIn as jest.Mock).mockResolvedValue({
      idToken: 'fake-token',
      provider: 'google',
    });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.status).toBe('authenticated');
    expect(result.current.session?.provider).toBe('google');
  });

  it('resets to idle without an error when cancelled', async () => {
    (googleAuthProvider.signIn as jest.Mock).mockRejectedValue(new AuthCancelledError());

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('sets an error message on genuine failure', async () => {
    (googleAuthProvider.signIn as jest.Mock).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('network down');
  });
});
```

**Manual QA checklist:**
- [ ] Google button launches OAuth sheet and returns to app on success
- [ ] Apple button only appears on iOS builds
- [ ] Cancelling either flow returns to idle silently, no error banner
- [ ] Killing network mid-auth shows the inline error banner, not a crash
- [ ] Buttons are disabled and show a spinner while a request is in flight
- [ ] Terms and Privacy Policy links open the correct URLs
- [ ] VoiceOver/TalkBack reads button labels and busy/disabled state correctly
- [ ] Successful sign-in persists across app restart (token present in Secure Store)

---

## 7. Acceptance Criteria (Definition of Done)

- [ ] Screen matches Figma frame `mars-login` (logo, title, subtitle, two buttons, footer with links)
- [ ] Google sign-in flow completes end-to-end and reaches `authenticated` status
- [ ] Apple sign-in flow completes end-to-end on iOS and reaches `authenticated` status
- [ ] Apple button is hidden on non-iOS platforms
- [ ] Session token is stored via `expo-secure-store`, never `AsyncStorage` or plain state alone
- [ ] Cancelling a sign-in attempt never surfaces an error to the user
- [ ] Genuine failures show a visible, non-blocking error message
- [ ] All auth logic (`googleAuthProvider`, `appleAuthProvider`, `useAuthStore`) is unit tested independent of any rendered UI
- [ ] No secrets or client IDs are committed to source control
