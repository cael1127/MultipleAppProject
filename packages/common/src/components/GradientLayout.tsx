import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { gradients, palette, type GradientKey, type PaletteKey } from '../theme';

export type GradientLayoutProps = {
  children: ReactNode;
  gradient?: GradientKey;
  tone?: PaletteKey;
  colors?: readonly string[];
  style?: StyleProp<ViewStyle>;
  overlay?: boolean;
};

export function GradientLayout({
  children,
  gradient,
  tone,
  colors,
  style,
  overlay = true,
}: GradientLayoutProps) {
  const gradientColors = colors ?? (gradient ? gradients[gradient] : tone ? gradients[tone] : gradients.neutral);
  const overlayColor = tone ? palette[tone].background : 'rgba(15, 23, 42, 0.45)';

  return (
    <LinearGradient colors={gradientColors} style={[styles.container, style]}>
      {overlay ? <View style={[styles.overlay, { backgroundColor: overlayColor }]} /> : null}
      <View style={styles.content}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.65,
  },
  content: {
    flex: 1,
  },
});

