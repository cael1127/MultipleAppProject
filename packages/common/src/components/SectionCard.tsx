import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { palette, type PaletteKey } from '../theme';

export type SectionCardProps = {
  children: ReactNode;
  tone?: PaletteKey;
  style?: StyleProp<ViewStyle>;
  elevation?: 'none' | 'soft' | 'strong';
  padding?: number;
};

export function SectionCard({
  children,
  tone = 'security',
  style,
  elevation = 'soft',
  padding = 20,
}: SectionCardProps) {
  const colors = palette[tone];

  return (
    <View
      style={[
        styles.card,
        elevationStyles[elevation],
        {
          backgroundColor: `${colors.backdrop}cc`,
          borderColor: `${colors.accent}30`,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
  },
});

const elevationStyles = StyleSheet.create({
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  strong: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
});

