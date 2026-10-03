/// <reference types="node" />
import { existsSync } from 'node:fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

// Extends app.json.
// - Google Sign-In's config plugin only adds the iOS URL scheme and refuses to run without
//   one, so it's added once an iOS OAuth client exists. Android needs no plugin.
// - Android push notifications go through Firebase Cloud Messaging, which needs
//   google-services.json from the Firebase console (public identifiers, safe to commit).
//   Builds before it exists simply have no remote notifications.
const GOOGLE_SERVICES_FILE = './google-services.json';

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const googlePlugin: [string, { iosUrlScheme: string }][] = iosClientId
    ? [
        [
          '@react-native-google-signin/google-signin',
          // The iOS client ID reversed: 123-abc.apps.googleusercontent.com → com.googleusercontent.apps.123-abc
          { iosUrlScheme: `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}` },
        ],
      ]
    : [];
  return {
    ...config,
    name: config.name ?? 'Jewels & Fits',
    slug: config.slug ?? 'jewelsandfits-mobile',
    android: {
      ...config.android,
      ...(existsSync(GOOGLE_SERVICES_FILE) ? { googleServicesFile: GOOGLE_SERVICES_FILE } : {}),
    },
    plugins: [...(config.plugins ?? []), ...googlePlugin],
  };
};
