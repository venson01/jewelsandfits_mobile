import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// Native Google Sign-In (@react-native-google-signin/google-signin, "original" API).
// The module has native code, so it exists only in development/store builds, not in
// Expo Go or on web. It's loaded lazily so those keep working without sign-in.

type GoogleModule = typeof import('@react-native-google-signin/google-signin');

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

let loaded: GoogleModule | null | undefined;

function google(): GoogleModule | null {
  if (loaded !== undefined) return loaded;
  loaded = null;
  if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return loaded;
  if (!WEB_CLIENT_ID || (Platform.OS === 'ios' && !IOS_CLIENT_ID)) return loaded;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: GoogleModule = require('@react-native-google-signin/google-signin');
    // webClientId makes Google issue the ID token for the website's client, which the
    // server verifies (AUTH_GOOGLE_ID). No offline access: we only need the identity.
    mod.GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, iosClientId: IOS_CLIENT_ID || undefined });
    loaded = mod;
  } catch (err) {
    console.warn('[google] native sign-in module unavailable', err);
  }
  return loaded;
}

/** Why sign-in can't run here, or null when it can. */
export function googleUnavailableReason(): string | null {
  if (Platform.OS === 'web') return 'Sign in from the Jewels & Fits app on your phone.';
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return 'Google sign-in needs the Jewels & Fits development build. It isn’t available in Expo Go.';
  }
  if (!WEB_CLIENT_ID || (Platform.OS === 'ios' && !IOS_CLIENT_ID)) {
    return 'Google sign-in isn’t set up for this build yet.';
  }
  return google() ? null : 'Google sign-in isn’t available in this build.';
}

export class GoogleSignInError extends Error {}

/** Shows Google's account picker. Returns the ID token, or null if the customer cancelled. */
export async function getGoogleIdToken(): Promise<string | null> {
  const mod = google();
  if (!mod) throw new GoogleSignInError(googleUnavailableReason() ?? 'Google sign-in isn’t available.');
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = mod;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null; // cancelled
    if (!response.data.idToken) throw new GoogleSignInError('Google didn’t return a sign-in token. Please try again.');
    return response.data.idToken;
  } catch (err) {
    if (err instanceof GoogleSignInError) throw err;
    if (isErrorWithCode(err)) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (err.code === statusCodes.IN_PROGRESS) return null;
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new GoogleSignInError('Google Play services is needed to sign in. Please update it and try again.');
      }
      // Android "DEVELOPER_ERROR" (10): this build's package name or signing key (SHA-1)
      // isn't registered on an Android OAuth client in Google Cloud Console.
      if (String(err.code) === '10' || err.code === 'DEVELOPER_ERROR') {
        throw new GoogleSignInError('Google sign-in isn’t set up for this build yet (Google error 10).');
      }
    }
    console.warn('[google] sign-in failed', err);
    const code = isErrorWithCode(err) ? ` (Google error ${err.code})` : '';
    throw new GoogleSignInError(`Google couldn’t sign you in${code}. Please try again.`);
  }
}

/** Clears Google's remembered account so the picker shows next time. */
export async function googleSignOut() {
  try {
    await google()?.GoogleSignin.signOut();
  } catch {
    // Not signed in with Google on this device; nothing to clear.
  }
}
