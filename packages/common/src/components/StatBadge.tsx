import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { palette, type PaletteKey } from '../theme';

export type TrendDirection = 'up' | 'down' | 'steady';

export type StatBadgeProps = {
  label: string;
  value: string;
  delta?: string;
  trend?: TrendDirection;
  tone?: PaletteKey;
  style?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  deltaStyle?: StyleProp<TextStyle>;
  isCompact?: boolean;
};

export function StatBadge({
  label,
  value,
  delta,
  trend = 'steady',
  tone = 'security',
  style,
  valueStyle,
  labelStyle,
  deltaStyle,
  isCompact = false,
}: StatBadgeProps) {
  const colors = palette[tone];
  const trendColor =
    trend === 'up' ? '#22c55e' : trend === 'down' ? '#f97316' : colors.textSecondary;
  const indicatorSymbol = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '◆';
  const containerStyles = [
    styles.container,
    containerToneStyles[tone],
    isCompact ? styles.containerCompact : styles.containerSpacious,
    { borderColor: colors.accent },
  ];

  return (
    <View style={[containerStyles, style]}>
      <Text style={[styles.label, { color: colors.textSecondary }, labelStyle]}>{label}</Text>
      <Text style={[styles.value, { color: colors.textPrimary }, valueStyle]}>{value}</Text>
      {delta ? (
        <Text style={[styles.delta, { color: trendColor }, deltaStyle]}>
          {indicatorSymbol} {delta}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
  },
  containerCompact: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  containerSpacious: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
  },
  delta: {
    fontSize: 13,
    fontWeight: '600',
  },
});

const containerToneStyles = StyleSheet.create({
  security: {
    backgroundColor: palette.security.backdrop,
  },
  ai: {
    backgroundColor: palette.ai.backdrop,
  },
  wellness: {
    backgroundColor: palette.wellness.backdrop,
  },
  finance: {
    backgroundColor: palette.finance.backdrop,
  },
  education: {
    backgroundColor: palette.education.backdrop,
  },
});

