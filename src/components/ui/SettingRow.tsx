import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

interface SettingRowProps {
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  toggle?: { value: boolean; onValueChange: (value: boolean) => void };
  accent?: string;
  style?: StyleProp<ViewStyle>;
  trailing?: React.ReactNode;
  danger?: boolean;
}

export function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  toggle,
  accent = colors.cyan,
  style,
  trailing,
  danger,
}: SettingRowProps) {
  const content = (
    <View style={[styles.row, style]}>
      {icon ? (
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={icon} size={17} color={danger ? colors.red : accent} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <Text style={[styles.title, danger && { color: colors.red }]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onValueChange}
          trackColor={{ false: '#0B2A47', true: 'rgba(56,225,255,0.5)' }}
          thumbColor={toggle.value ? colors.cyan : '#7FA8C9'}
        />
      ) : null}
      {trailing}
      {onPress && !toggle && !trailing ? (
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textDim} />
      ) : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
      {content}
    </Pressable>
  );
}

export function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(120,190,240,0.12)',
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(56,225,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    flexShrink: 1,
    gap: 1,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
  },
  value: {
    color: colors.cyan,
    fontSize: 12.5,
    fontWeight: '700',
    flexShrink: 0,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(4, 24, 44, 0.9)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flexGrow: 1,
    flexShrink: 0,
    minWidth: 48,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  segmentItemActive: {
    backgroundColor: 'rgba(56, 225, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(56, 225, 255, 0.5)',
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: colors.cyan,
  },
});
