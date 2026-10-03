import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { api } from './api';
import { queryClient } from './queries';
import { useSession } from './session';

// The wishlist lives on the account (shared with the website), so it needs sign-in.

type WishlistData = Awaited<ReturnType<typeof api.wishlist>>;
const KEY = ['wishlist'];

export function useWishlist() {
  const signedIn = useSession((s) => s.status === 'signedIn');
  return useQuery({ queryKey: KEY, queryFn: api.wishlist, enabled: signedIn });
}

/** Whether a product is saved. False while signed out or loading. */
export function useIsSaved(productId: string) {
  const { data } = useWishlist();
  return data?.productIds.includes(productId) ?? false;
}

/** Saves or un-saves a product, updating the hearts straight away and rolling back on error. */
export function useToggleWishlist() {
  const signedIn = useSession((s) => s.status === 'signedIn');
  return useCallback(
    async (productId: string) => {
      if (!signedIn) {
        Alert.alert('Save pieces you love', 'Sign in to keep a wishlist on your phone and the website.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.navigate('/account') },
        ]);
        return;
      }
      const previous = queryClient.getQueryData<WishlistData>(KEY);
      const saved = previous?.productIds.includes(productId) ?? false;
      queryClient.setQueryData<WishlistData>(KEY, (d) => ({
        items: (d?.items ?? []).filter((p) => !saved || p.id !== productId),
        productIds: saved ? (d?.productIds ?? []).filter((id) => id !== productId) : [productId, ...(d?.productIds ?? [])],
      }));
      try {
        await (saved ? api.removeFromWishlist(productId) : api.addToWishlist(productId));
      } catch {
        queryClient.setQueryData(KEY, previous);
        Alert.alert('Couldn’t update your wishlist', 'Please check your connection and try again.');
      } finally {
        // Refresh the saved items (cards) behind the scenes.
        void queryClient.invalidateQueries({ queryKey: KEY });
      }
    },
    [signedIn],
  );
}
