import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

interface SectionLabelProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
}

/** Small uppercase caption used above card content ("Display backlight"). */
export function SectionLabel({ children, style, color = colors.textMuted }: SectionLabelProps) {
  return <Text style={[styles.label, { color }, style]}>{children}</Text>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
});
