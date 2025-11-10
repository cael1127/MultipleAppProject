import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { palette, type PaletteKey } from '../theme';

export type ChecklistStatus = 'done' | 'in_progress' | 'queued';

export type ChecklistItem = {
  id: string;
  title: string;
  description?: string;
  status?: ChecklistStatus;
};

export type ChecklistProps = {
  items: ChecklistItem[];
  tone?: PaletteKey;
  style?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
};

export function Checklist({
  items,
  tone = 'security',
  style,
  itemStyle,
  titleStyle,
  descriptionStyle,
}: ChecklistProps) {
  const colors = palette[tone];

  return (
    <View style={[styles.container, style]}>
      {items.map((item) => {
        const status = item.status ?? 'queued';
        const indicatorStyle =
          status === 'done'
            ? styles.indicatorDone
            : status === 'in_progress'
            ? styles.indicatorProgress
            : styles.indicatorQueued;

        return (
          <View key={item.id} style={[styles.row, itemStyle]}>
            <View
              style={[
                styles.indicator,
                indicatorStyle,
                {
                  borderColor: colors.accent,
                },
              ]}
            />
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: colors.textPrimary }, titleStyle]}>
                {item.title}
              </Text>
              {item.description ? (
                <Text
                  style={[
                    styles.description,
                    { color: colors.textSecondary },
                    descriptionStyle,
                  ]}
                >
                  {item.description}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  indicator: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorDone: {
    backgroundColor: '#22c55e',
  },
  indicatorProgress: {
    backgroundColor: '#facc15',
  },
  indicatorQueued: {
    backgroundColor: 'transparent',
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
});

