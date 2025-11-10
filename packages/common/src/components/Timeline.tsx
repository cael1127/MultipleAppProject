import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { palette, type PaletteKey } from '../theme';

export type TimelineStatus = 'completed' | 'active' | 'upcoming';

export type TimelineItem = {
  id: string;
  title: string;
  timeLabel?: string;
  description?: string;
  status?: TimelineStatus;
};

export type TimelineProps = {
  items: TimelineItem[];
  tone?: PaletteKey;
  style?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
  showConnector?: boolean;
};

export function Timeline({
  items,
  tone = 'education',
  style,
  itemStyle,
  titleStyle,
  descriptionStyle,
  showConnector = true,
}: TimelineProps) {
  const colors = palette[tone];

  return (
    <View style={[styles.container, style]}>
      {items.map((item, index) => {
        const status = item.status ?? 'upcoming';
        const isLast = index === items.length - 1;
        const badgeStyle =
          status === 'completed'
            ? styles.badgeCompleted
            : status === 'active'
            ? styles.badgeActive
            : styles.badgeUpcoming;

        return (
          <View key={item.id} style={styles.itemWrapper}>
            <View style={styles.track}>
              <View
                style={[
                  styles.badge,
                  badgeStyle,
                  {
                    borderColor: colors.accent,
                  },
                ]}
              />
              {showConnector && !isLast ? (
                <View
                  style={[
                    styles.connector,
                    {
                      backgroundColor: colors.faint,
                    },
                  ]}
                />
              ) : null}
            </View>
            <View style={[styles.itemContent, itemStyle]}>
              <View style={styles.header}>
                {item.timeLabel ? (
                  <Text style={[styles.time, { color: colors.textSecondary }]}>{item.timeLabel}</Text>
                ) : null}
                <Text style={[styles.title, { color: colors.textPrimary }, titleStyle]}>
                  {item.title}
                </Text>
              </View>
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
    gap: 16,
  },
  itemWrapper: {
    flexDirection: 'row',
    gap: 16,
  },
  track: {
    alignItems: 'center',
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 2,
  },
  badgeCompleted: {
    backgroundColor: '#22c55e',
  },
  badgeActive: {
    backgroundColor: '#60a5fa',
  },
  badgeUpcoming: {
    backgroundColor: 'transparent',
  },
  connector: {
    width: 2,
    flex: 1,
    marginTop: 2,
  },
  itemContent: {
    flex: 1,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.3)',
    gap: 6,
  },
  header: {
    gap: 4,
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
});

