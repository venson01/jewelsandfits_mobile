import { router, usePathname } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Where the website's payment callback sends the customer back into the app
 * (MOBILE_APP_RETURN_URL on the website; its default matches). The callback has already
 * verified the payment by then; the result screen re-reads the order either way.
 */
export const PAYMENT_RETURN_URL = 'jewelsandfits://checkout/result';
const RESULT_PATH = '/checkout/result';

/**
 * Opens Paystack/Flutterwave in an in-app browser (when there's a checkoutUrl), then shows
 * the order's result screen. On Android the return link also reaches Expo Router, which may
 * open the result screen itself, so this only navigates if that hasn't happened.
 */
export function usePayAndShowResult() {
  const pathname = usePathname();
  const current = useRef(pathname);
  useEffect(() => {
    current.current = pathname;
  }, [pathname]);

  return useCallback(async (orderNumber: string, checkoutUrl: string | null) => {
    if (checkoutUrl) {
      await WebBrowser.openAuthSessionAsync(checkoutUrl, PAYMENT_RETURN_URL);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    if (current.current !== RESULT_PATH) {
      router.replace({ pathname: RESULT_PATH, params: { order: orderNumber } });
    }
  }, []);
}
