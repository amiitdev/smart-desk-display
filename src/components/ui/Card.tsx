import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii } from '@/theme';

export type CardTone = 'default' | 'raised' | 'weather' | 'ink';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  tone?: CardTone;
  /** Adds the brighter neon rim used for primary panels. */
  highlighted?: boolean;
  padded?: boolean;
}

const GRADIENTS: Record<CardTone, readonly [string, string]> = {
  default: ['#031B31', '#010A18'],
  raised: ['#06263F', '#02101F'],
  weather: ['#A8E6FE', '#78D2FB'],
  ink: ['#010A18', '#000512'],
};

const BORDERS: Record<CardTone, string> = {
  default: colors.borderStrong,
  raised: colors.cyanDim,
  weather: 'rgba(255,255,255,0.55)',
  ink: colors.borderSoft,
};

/**
 * The single panel primitive of the dashboard. Every section in the reference
 * artwork is a rounded navy card with a thin electric-blue rim, so all screens
 * share one implementation to keep proportions consistent.
 */
export function Card({ children, style, contentStyle, tone = 'default', highlighted, padded = true }: CardProps) {
  return (
    <LinearGradient
      colors={GRADIENTS[tone] as unknown as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={[styles.card, { borderColor: highlighted ? colors.cyan : BORDERS[tone] }, style]}
    >
      <View style={[padded && styles.padded, contentStyle]}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  padded: {
    padding: 12,
    flex: 1,
  },
});
