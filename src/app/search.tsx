import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ProductGrid } from '@/components/product-grid';
import { EmptyView } from '@/components/states';
import { colors, fonts, gutter, radius, space } from '@/constants/theme';

/** Searches names, descriptions and tags as you type (after a short pause). */
export default function SearchScreen() {
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  return (
    <View style={styles.screen}>
      <View style={styles.bar}>
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Search rings, necklaces, gold…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => setQuery(text.trim())}
          accessibilityLabel="Search jewellery"
        />
        {text ? (
          <Pressable onPress={() => setText('')} hitSlop={10} accessibilityLabel="Clear search">
            <Icon name="close" size={16} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {query.length >= 2 ? (
        <ProductGrid
          query={{ q: query }}
          emptyTitle="No matches"
          emptyBody={`We couldn't find anything for “${query}”. Try another word, like “gold” or “earrings”.`}
        />
      ) : (
        <EmptyView title="Find your piece" body="Search by name, metal, stone or occasion." />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ivory },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 46,
    marginHorizontal: gutter,
    marginBottom: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.blush100,
  },
  input: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingVertical: 0 },
});
