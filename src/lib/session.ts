import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { api, setSessionToken, setUnauthorizedHandler } from './api';
import { useBag } from './bag';
import { mergeBagIntoAccount, pullBagFromAccount } from './bag-sync';
import { getGoogleIdToken, googleSignOut } from './google';
import { disableOrderNotificationsForThisDevice, enableOrderNotifications } from './notifications';
import { queryClient } from './queries';
import type { User } from './types';

// The API session token lives in the OS keychain/keystore (expo-secure-store), never in
// AsyncStorage. The user profile is cached beside it so the app can show who's signed in
// while offline.

const TOKEN_KEY = 'jf.session-token';
const USER_KEY = 'jf.session-user';

type SessionState = {
  status: 'restoring' | 'signedOut' | 'signedIn';
  user: User | null;
};

export const useSession = create<SessionState>(() => ({ status: 'restoring', user: null }));

// SecureStore has no web implementation; the web preview simply doesn't remember sign-in.
const secure = Platform.OS !== 'web';
const read = (key: string) => (secure ? SecureStore.getItemAsync(key) : Promise.resolve(null));
const write = (key: string, value: string) => (secure ? SecureStore.setItemAsync(key, value) : Promise.resolve());
const remove = (key: string) => (secure ? SecureStore.deleteItemAsync(key) : Promise.resolve());

async function clearLocalSession() {
  setSessionToken(null);
  useSession.setState({ status: 'signedOut', user: null });
  queryClient.removeQueries({ queryKey: ['me'] });
  queryClient.removeQueries({ queryKey: ['orders'] });
  queryClient.removeQueries({ queryKey: ['order'] });
  queryClient.removeQueries({ queryKey: ['wishlist'] });
  queryClient.removeQueries({ queryKey: ['review-eligibility'] });
  // The bag mirrored the account's saved cart, which keeps it. Emptying it here (after the
  // token is cleared, so bag sync doesn't save the empty bag) stops a stale copy from putting
  // already-bought items back at the next sign-in.
  useBag.getState().clear();
  await Promise.all([remove(TOKEN_KEY), remove(USER_KEY)]);
}

// The server rejected our token (expired, or revoked by signing out elsewhere).
setUnauthorizedHandler(() => {
  void clearLocalSession();
});

/** Call once at startup. */
export async function restoreSession() {
  const [token, userJson] = await Promise.all([read(TOKEN_KEY), read(USER_KEY)]);
  if (!token) {
    useSession.setState({ status: 'signedOut', user: null });
    return;
  }
  setSessionToken(token);
  let user: User | null = null;
  try {
    user = userJson ? (JSON.parse(userJson) as User) : null;
  } catch {
    // Corrupt cache; /me below refreshes it.
  }
  useSession.setState({ status: 'signedIn', user });

  // Refresh the profile and adopt the saved cart (it may have changed on the website).
  // A 401 here signs out via the handler above; other errors keep the cached session.
  try {
    const me = await api.me();
    useSession.setState({ user: me.user });
    await write(USER_KEY, JSON.stringify(me.user));
    await pullBagFromAccount();
    // Re-register in case the push token changed (only if notifications are already allowed).
    void enableOrderNotifications({ ask: false });
  } catch (err) {
    console.warn('[session] refresh failed', err);
  }
}

/** Google sign-in. Resolves 'cancelled' if the customer closed the account picker. */
export async function signIn(): Promise<'signedIn' | 'cancelled'> {
  const idToken = await getGoogleIdToken();
  if (!idToken) return 'cancelled';
  const session = await api.signInWithGoogle(idToken, Device.modelName ?? null);
  await Promise.all([write(TOKEN_KEY, session.token), write(USER_KEY, JSON.stringify(session.user))]);
  setSessionToken(session.token);
  useSession.setState({ status: 'signedIn', user: session.user });
  // Bring the bag built while signed out into the account (and pick up the website cart).
  try {
    await mergeBagIntoAccount();
  } catch (err) {
    console.warn('[session] bag merge failed', err);
  }
  void enableOrderNotifications({ ask: false });
  return 'signedIn';
}

export async function signOut() {
  await disableOrderNotificationsForThisDevice(); // while the token still works
  try {
    await api.signOut(); // revokes the token on the server
  } catch (err) {
    console.warn('[session] server sign-out failed', err);
  }
  await googleSignOut();
  await clearLocalSession();
}
