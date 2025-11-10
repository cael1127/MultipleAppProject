import type { ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, type PaletteKey } from '../theme';

export type TabItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: number | string;
  tone?: PaletteKey;
};

export type NavigationTabsProps = {
  items: TabItem[];
  activeId: string;
  onChange: (tabId: string) => void;
  style?: StyleProp<ViewStyle>;
  pill?: boolean;
};

export function NavigationTabs({ items, activeId, onChange, style, pill = true }: NavigationTabsProps) {
  return (
    <View style={[styles.container, style]}>
      {items.map((item) => {
        const isActive = item.id === activeId;
        const tone = item.tone ?? 'security';
        const colors = palette[tone];

        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(item.id)}
            style={({ pressed }) => [
              styles.tab,
              pill && styles.tabPill,
              {
                backgroundColor: isActive ? `${colors.accent}22` : 'transparent',
                borderColor: isActive ? `${colors.accent}70` : 'rgba(148, 163, 184, 0.35)',
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            {item.icon ? <View style={styles.icon}>{item.icon}</View> : null}
            <Text style={[styles.label, isActive ? activeLabelStyles[tone] : styles.labelInactive]}>
              {item.label}
            </Text>
            {item.badge !== undefined ? (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: Platform.select({ ios: 10, default: 12 }),
    paddingHorizontal: 16,
    minHeight: 44,
  },
  tabPill: {
    borderRadius: 999,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  labelInactive: {
    color: '#e2e8f0',
  },
  icon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
});

const activeLabelStyles = (Object.keys(palette) as PaletteKey[]).reduce(
  (acc, key) => {
    acc[key] = { color: palette[key].accent } as TextStyle;
    return acc;
  },
  {} as Record<PaletteKey, TextStyle>,
);

