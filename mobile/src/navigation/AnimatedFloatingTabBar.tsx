import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme/tokens';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'grid-outline',
  Transactions: 'list-outline',
  AddTransaction: 'add',
  Budgets: 'wallet-outline',
  Profile: 'person-outline',
};
const ACTIVE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'grid',
  Transactions: 'list',
  AddTransaction: 'add',
  Budgets: 'wallet',
  Profile: 'person',
};
const TAB_COUNT = 5;
const BUBBLE_SIZE = 58;

export function AnimatedFloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const barWidth = Math.min(windowWidth - 36, 420);
  const tabWidth = barWidth / TAB_COUNT;
  const activeIndex = state.index;
  const position = useSharedValue(activeIndex);

  useEffect(() => {
    position.value = withSpring(activeIndex, { damping: 17, stiffness: 190, mass: 0.72 });
  }, [activeIndex, position]);

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(position.value, [0, TAB_COUNT - 1], [0, tabWidth * (TAB_COUNT - 1)]) }],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: Math.max(insets.bottom, 10) + 8 }]}>
      <View style={[styles.bar, { width: barWidth }]}>
        <Animated.View pointerEvents="none" style={[styles.bubbleCutout, { left: (tabWidth - 74) / 2 }, bubbleStyle]} />
        <Animated.View pointerEvents="none" style={[styles.bubbleDock, { left: (tabWidth - BUBBLE_SIZE) / 2 }, bubbleStyle]}>
          <View style={styles.bubble}>
            <View style={styles.bubbleCore}><Ionicons name={(ACTIVE_ICONS[state.routes[activeIndex]?.name ?? 'Home'] ?? 'grid')} size={22} color="#FFFFFF" /></View>
          </View>
        </Animated.View>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isAction = route.name === 'AddTransaction';
          const options = descriptors[route.key]?.options;
          const onPress = async () => {
            if (!isFocused) {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!event.defaultPrevented) navigation.navigate(route.name, route.params);
            }
            try { await Haptics.selectionAsync(); } catch { /* Haptics are optional on unsupported devices. */ }
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? route.name}
              onPress={onPress}
              style={styles.tab}
              hitSlop={6}
            >
              {isFocused ? <View style={styles.iconSpacer} /> : (
                <Ionicons name={ICONS[route.name] ?? 'ellipse-outline'} size={isAction ? 26 : 22} color={isAction ? colors.primary : '#9692A0'} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' },
  bar: {
    height: 66,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    shadowColor: '#302044',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.13,
    shadowRadius: 20,
    elevation: 14,
    borderWidth: 1,
    borderColor: 'rgba(36,20,55,0.04)',
  },
  tab: { flex: 1, height: 66, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  iconSpacer: { width: 25, height: 25 },
  bubbleCutout: { position: 'absolute', top: -33, width: 74, height: 74, borderRadius: 37, backgroundColor: colors.background, zIndex: 1 },
  bubbleDock: { position: 'absolute', top: -24, width: BUBBLE_SIZE, height: BUBBLE_SIZE, zIndex: 3, alignItems: 'center', justifyContent: 'center' },
  bubble: { width: BUBBLE_SIZE, height: BUBBLE_SIZE, borderRadius: BUBBLE_SIZE / 2, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#3D2467', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.12, shadowRadius: 9, elevation: 9 },
  bubbleCore: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
