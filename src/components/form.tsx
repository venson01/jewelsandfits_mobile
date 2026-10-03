import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, gutter, radius, space } from '@/constants/theme';

import { Icon } from './icon';
import { Text } from './text';

type FieldProps = TextInputProps & { label: string; error?: string; optional?: boolean };

export function TextField({ label, error, optional, style, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text variant="label">
        {label}
        {optional ? <Text variant="small"> (optional)</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, !!error && styles.inputError, style]}
        accessibilityLabel={label}
        {...input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function SwitchRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable style={styles.switchRow} onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={styles.switchText}>
        <Text variant="bodyMedium">{label}</Text>
        {hint ? <Text variant="small">{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.plum500, false: colors.blush200 }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.blush200}
      />
    </Pressable>
  );
}

/** A selectable card (radio behaviour). */
export function Choice({
  selected,
  onPress,
  children,
  label,
}: {
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.choiceBody}>{children}</View>
    </Pressable>
  );
}

/** Field that opens a full-screen list of states. */
export function StatePicker({
  label,
  value,
  states,
  onChange,
  error,
}: {
  label: string;
  value: string;
  states: string[];
  onChange: (state: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.input, styles.select, !!error && styles.inputError]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || 'not chosen'}`}>
        <Text style={value ? styles.selectValue : styles.selectPlaceholder}>{value || 'Choose a state'}</Text>
        <Icon name="chevronRight" size={16} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modal, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text variant="title">{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityLabel="Close">
              <Icon name="close" color={colors.plum700} />
            </Pressable>
          </View>
          <FlatList
            data={states}
            keyExtractor={(s) => s}
            contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
            renderItem={({ item }) => (
              <Pressable
                style={styles.option}
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: item === value }}>
                <Text variant={item === value ? 'bodyMedium' : 'body'}>{item}</Text>
                {item === value ? <Icon name="check" size={18} color={colors.plum700} /> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  input: {
    minHeight: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.blush200,
    backgroundColor: colors.white,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  inputError: { borderColor: colors.danger },
  error: { fontFamily: fonts.sans, fontSize: 13, color: colors.danger },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectValue: { fontFamily: fonts.sans, fontSize: 15, color: colors.ink },
  selectPlaceholder: { fontFamily: fonts.sans, fontSize: 15, color: colors.muted },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  switchText: { flex: 1, gap: 2 },
  choice: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.blush200,
    backgroundColor: colors.white,
  },
  choiceSelected: { borderColor: colors.plum700, backgroundColor: colors.blush100 },
  choiceBody: { flex: 1, gap: 2 },
  radio: {
    width: 20,
    height: 20,
    marginTop: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.blush200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.plum700 },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.plum700 },
  modal: { flex: 1, backgroundColor: colors.ivory },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.blush200,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.blush200,
  },
});
