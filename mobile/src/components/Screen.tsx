import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';

export function Screen({ children, contentStyle }: { children: React.ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.content, contentStyle]} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 120, gap: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
