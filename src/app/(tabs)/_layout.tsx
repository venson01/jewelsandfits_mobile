import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors, fonts } from '@/constants/theme';
import { useBagCount } from '@/lib/bag';
import { useOrderNotificationHandling } from '@/lib/notifications';

export default function TabsLayout() {
  const bagCount = useBagCount();
  useOrderNotificationHandling();
  return (
    <NativeTabs
      tintColor={colors.plum700}
      backgroundColor={colors.ivory}
      indicatorColor={colors.blush200}
      labelStyle={{ fontFamily: fonts.sansMedium }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="shop">
        <NativeTabs.Trigger.Label>Shop</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} md="grid_view" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bag">
        <NativeTabs.Trigger.Label>Bag</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bag', selected: 'bag.fill' }} md="shopping_bag" />
        {bagCount > 0 ? <NativeTabs.Trigger.Badge>{bagCount > 9 ? '9+' : String(bagCount)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
