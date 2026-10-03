This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Jewels & Fits by saRizona: the shop app

The mobile app for the Jewels & Fits online jewellery store. The website lives in `../jewelsandfits` (GitHub `venson01/jewelsandfits`); its `AGENTS.md` is the source of truth for the brand, business rules and the API this app calls (§5 "Mobile app API").

- **Data:** everything comes from the website's JSON API at `/api/mobile/v1` (`src/lib/api.ts`). Never compute prices or totals in the app: money is integer kobo from the server, shown with `formatMoney()`. Response types in `src/lib/types.ts` mirror the website's `src/server/mobile/serialize.ts`; update both together.
- **API address:** the live site by default. To use a local website, copy `.env.example` to `.env.local`, set `EXPO_PUBLIC_API_URL=http://<your PC's Wi-Fi IP>:3000`, run the website with `pnpm dev -H 0.0.0.0`, and restart Expo.
- **Fetching:** TanStack Query hooks in `src/lib/queries.ts`. **Bag:** Zustand store saved with AsyncStorage (`src/lib/bag.ts`); its prices are a display snapshot, and the bag screen re-prices via `POST /cart/quote`.
- **Design:** tokens in `src/constants/theme.ts` match the website (plum, blush, rose gold; Cormorant Garamond headings, Jost text). Use the tokens, not raw hex. Rose gold only for large text. Light mode only.
- **Screens:** tabs `(tabs)/index` (home), `shop`, `bag`, `account`; stack screens `product/[slug]`, `products` (listing for category/collection/bestsellers, via params), `search`.
- **App ID:** `com.sarizona.jewelsandfits` (Android package and iOS bundle ID). Permanent once published.
- **Sign-in:** native Google Sign-In (`@react-native-google-signin/google-signin`, free "original" API) in `src/lib/google.ts`, configured with the website's **web** OAuth client (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in the committed `.env`), so the ID token's audience is `AUTH_GOOGLE_ID` and the server accepts it. The app posts it to `POST /auth/google` and keeps the returned session token in `expo-secure-store` (`src/lib/session.ts`); `api.ts` sends it as a Bearer token and a 401 signs the app out. Native code: works in development/store builds only, not Expo Go (the Account tab says so instead of crashing; the module is `require`d lazily).
- **Google Cloud setup** (same project as the website): an **Android** OAuth client with package `com.sarizona.jewelsandfits` and the SHA-1 of each signing key (EAS development key: `npx eas-cli@latest credentials -p android`; the Play Store's app-signing key once published). Wrong or missing SHA-1 shows "Google error 10". For iOS, create an **iOS** client, put its ID in `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (`app.config.ts` then adds the plugin's URL scheme) and in the website's `AUTH_GOOGLE_MOBILE_CLIENT_IDS`.
- **Bag sync** (`src/lib/bag-sync.ts`): at sign-in the device bag merges into the account cart (shared with the website); at launch the saved cart is adopted; edits are saved with `PUT /cart`.
- **Checkout** (`src/app/checkout/index.tsx`): signed-in only. Totals, delivery zone and discounts always come from `POST /cart/quote`; `POST /checkout` takes the website's `checkoutSchema` and returns `{ orderNumber, checkoutUrl }`. `usePayAndShowResult()` (`src/lib/payment.ts`) opens `checkoutUrl` with `WebBrowser.openAuthSessionAsync(url, 'jewelsandfits://checkout/result')`; the website's `/api/mobile/v1/payments/callback/*` verifies the payment and redirects to that link. On Android the link also reaches Expo Router (which opens `checkout/result` itself), so the hook only navigates if that hasn't happened. `checkout/result` re-reads the order (polling while `pending_payment`), empties the bag once confirmed, and offers retry (`POST /orders/:n/pay`). Orders: `orders/index`, `orders/[orderNumber]`.
- **Wishlist** (`src/lib/wishlist.ts`): account-only, shared with the website. `useWishlist()` caches `GET /wishlist` under `['wishlist']`; `useToggleWishlist()` updates the hearts optimistically and rolls back on error; signed out it offers sign-in. `WishlistButton` sits on every `ProductCard` and the product page; the list is `src/app/wishlist.tsx` (home top bar heart, Account → Wishlist). `HeartIcon` draws the filled heart from shapes on Android, because expo-symbols uses the outlined Material Symbols font there.
- **Reviews:** `review/[productId]` (modal) posts to `POST /reviews` (moderated). The product page shows "Write a review" only when `GET /reviews/eligibility` says so (delivered order, not yet reviewed); delivered orders show a review link per item.
- **Order notifications** (`src/lib/notifications.ts`): `expo-notifications` with Expo push tokens, registered to the account via `POST /push-tokens` and removed on sign-out (`DELETE`). Registered silently at sign-in/launch when permission was already given; the prompt (`OrderNotificationsPrompt`) shows on the order confirmation screen and under Account, and offers Settings when blocked. Android channel `orders` ("Order updates"), matching the website's `ORDER_CHANNEL_ID`. Tapping a notification opens `orders/[orderNumber]` (`useOrderNotificationHandling()` in the tabs layout, also covers cold start). Push needs a real device and a development/store build (not Expo Go, not emulators). **Android needs Firebase:** `google-services.json` (from the Firebase console, safe to commit; `app.config.ts` adds `android.googleServicesFile` when the file exists) and the FCM V1 service-account key uploaded to EAS (`eas credentials` → Android → Google Service Account → Push Notifications (FCM V1)). Never commit the service-account key (`.gitignore` covers the usual names).
- **Typed routes** (`.expo/types/router.d.ts`, generated) can go stale in a long-running `expo start` after adding screens (e.g. listing `/../components/x` or `/checkout/index`). Restart Expo to regenerate rather than changing hrefs.
- **Builds:** EAS (`eas.json`): `development` (dev client APK), `preview` (APK for testers), `production`. `pnpm start` now opens the dev build; press `s` to switch to Expo Go.
- `Link asChild` children need a single style object (`StyleSheet.flatten`), not an array, or Expo Router throws.
- **Web preview** (`w` in Expo) is for layout checks only. The live API sends no CORS headers, so the web build can only load data from a local website in development.

**Status (2026-10-02):** browsing, search, product pages, the bag, Google sign-in (Android, tested on a device; iOS needs an iOS client), account with saved addresses, bag sync, checkout with Paystack/Flutterwave (tested on a device), the order result screen, order history, wishlist, reviews and order push notifications (needs Firebase setup + a new dev build to test) are built. Next: Play Store release.

Before finishing a change: `pnpm lint` and `pnpm typecheck`.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
