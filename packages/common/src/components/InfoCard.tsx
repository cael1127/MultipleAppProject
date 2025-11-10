import type { ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { palette, type PaletteKey } from '../theme';

export type InfoCardProps = {
  title: string;
  children: ReactNode;
  tone?: PaletteKey;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  spacing?: number;
};

export function InfoCard({
  title,
  children,
  tone,
  subtitle,
  style,
  titleStyle,
  subtitleStyle,
  contentStyle,
  spacing = 12,
}: InfoCardProps) {
  const colors = tone ? palette[tone] : undefined;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors?.backdrop ?? '#111c3a',
          borderColor: colors?.accent ?? '#2563eb',
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: colors?.accent ?? '#38bdf8',
          },
          titleStyle,
        ]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            {
              color: colors?.textSecondary ?? '#cbd5f5',
            },
            subtitleStyle,
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
      <View style={[{ gap: spacing }, styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 6,
  },
  content: {
    marginTop: 16,
  },
});

