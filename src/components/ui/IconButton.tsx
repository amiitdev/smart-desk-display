import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii } from '@/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface IconButtonProps {
  icon: IconName;
  onPress?: () => void;
  label?: string;
  size?: number;
  variant?: 'solid' | 'outline' | 'ghost' | 'dark';
  color?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  flex?: number;
}

const VARIANTS = {
  solid: { backgroundColor: '#C3EEFF', borderColor: 'rgba(255,255,255,0.5)', foreground: '#04243D' },
  outline: { backgroundColor: 'rgba(4, 30, 52, 0.7)', borderColor: colors.borderStrong, foreground: colors.cyan },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent', foreground: colors.cyan },
  dark: { backgroundColor: 'rgba(0, 12, 28, 0.75)', borderColor: colors.borderSoft, foreground: colors.text },
} as const;

/** Chunky rounded control used for media transport, chips and quick actions. */
export function IconButton({
  icon,
  onPress,
  label,
  size = 44,
  variant = 'solid',
  color,
  style,
  disabled,
  accessibilityLabel,
  flex,
}: IconButtonProps) {
  const theme = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label ?? icon}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: size,
          backgroundColor: theme.backgroundColor,
          borderColor: theme.borderColor,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        flex !== undefined && { flex },
        style,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={size * 0.52} color={color ?? theme.foreground} />
      {label ? (
        <Text
          style={[styles.label, { color: color ?? theme.foreground, fontSize: Math.max(11, size * 0.24) }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

interface ChipProps {
  children: React.ReactNode;
  icon?: IconName;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  dotColor?: string;
}

export function Chip({
  children,
  icon,
  color = colors.text,
  backgroundColor = 'rgba(6, 34, 58, 0.9)',
  borderColor = colors.borderSoft,
  onPress,
  style,
  dotColor,
}: ChipProps) {
  const content = (
    <View style={[styles.chip, { backgroundColor, borderColor }, style]}>
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      {icon ? <MaterialCommunityIcons name={icon} size={14} color={color} /> : null}
      <Text style={[styles.chipText, { color }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radii.inner,
    borderWidth: 1,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
