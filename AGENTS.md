This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Jewels & Fits by saRizona: the shop app

The mobile app for the Jewels & Fits online jewellery store. The website lives in `../jewelsandfits` (GitHub `venson01/jewelsandfits`); its `AGENTS.md` is the source of truth for the brand, business rules and the API this app calls (§5 "Mobile app API").

- **Data:** everything comes from the website's JSON API at `/api/mobile/v1` (`src/lib/api.ts`). Never compute prices or totals in the app: money is integer kobo from the server, shown with `formatMoney()`. Response types in `src/lib/types.ts` mirror the website's `src/server/mobile/serialize.ts`; update both together.
- **API address:** the live site by default. To use a local website, copy `.env.example` to `.env.local`, set `EXPO_PUBLIC_API_URL=http://<your PC's Wi-Fi IP>:3000`, run the website with `pnpm dev -H 0.0.0.0`, and restart Expo.
- **Fetching:** TanStack Query hooks in `src/lib/queries.ts`. **Bag:** Zustand store saved with AsyncStorage (`src/lib/bag.ts`); its prices are a display snapshot, and the bag screen re-prices via `POST /cart/quote`.
- **Design:** tokens in `src/constants/theme.ts` match the website (plum, blush, rose gold; Cormorant Garamond headings, Jost text). Use the tokens, not raw hex. Rose gold only for large text. Light mode only.
- **Screens:** tabs `(tabs)/index` (home), `shop`, `bag`; stack screens `product/[slug]`, `products` (listing for category/collection/bestsellers, via params), `search`.
- `Link asChild` children need a single style object (`StyleSheet.flatten`), not an array, or Expo Router throws.
- **Web preview** (`w` in Expo) is for layout checks only. The live API sends no CORS headers, so the web build can only load data from a local website in development.

**Status (2026-10-02):** browsing, search, product pages and the bag are built. Next: Google sign-in (needs Android/iOS OAuth clients), synced cart and wishlist, checkout with Paystack, orders and account.

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
