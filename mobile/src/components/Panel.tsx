import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

export function Panel({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#34264B',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.045,
    shadowRadius: 14,
    elevation: 2,
  },
});
