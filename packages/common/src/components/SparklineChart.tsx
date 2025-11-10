import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { palette, type PaletteKey } from '../theme';

export type SparklinePoint = {
  value: number;
  label?: string;
};

export type SparklineChartProps = {
  data: SparklinePoint[];
  tone?: PaletteKey;
  gradientStops?: [string, string];
  showHeader?: boolean;
  title?: string;
  subtitle?: string;
  hero?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SparklineChart({
  data,
  tone = 'security',
  gradientStops,
  showHeader = true,
  title,
  subtitle,
  hero,
  style,
}: SparklineChartProps) {
  const colors = palette[tone];
  const width = 260;
  const height = 120;
  const min = Math.min(...data.map((point) => point.value));
  const max = Math.max(...data.map((point) => point.value));
  const verticalRange = max - min || 1;
  const pointGap = width / Math.max(data.length - 1, 1);

  const path = data
    .map((point, index) => {
      const x = index * pointGap;
      const normalized = (point.value - min) / verticalRange;
      const y = height - normalized * height;
      return `${index === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  const gradientId = `${tone}-sparkline-gradient`;
  const fillGradientStops = gradientStops ?? [colors.accentSecondary, `${colors.accent}00`];

  return (
    <View style={[styles.container, style, { borderColor: `${colors.accent}33`, backgroundColor: `${colors.backdrop}aa` }]}>
      {showHeader && (title || subtitle || hero) ? (
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            {title ? <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text> : null}
            {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
          </View>
          {hero}
        </View>
      ) : null}
      <Svg height={height} width="100%" viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <Stop offset="15%" stopColor={fillGradientStops[0]} stopOpacity={0.65} />
            <Stop offset="100%" stopColor={fillGradientStops[1]} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path
          d={`${path} L${width},${height} L0,${height} Z`}
          fill={`url(#${gradientId})`}
          stroke="none"
        />
        <Path
          d={path}
          stroke={colors.accent}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <View style={styles.labels}>
        {data.map((point, index) => (
          <Text key={`${point.label ?? index}`} style={[styles.label, { color: colors.textSecondary }]}>
            {point.label ?? index + 1}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    gap: 4,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

