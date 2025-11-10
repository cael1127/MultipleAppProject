import type { ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, type PaletteKey } from '../theme';

export type ModalSheetAction = {
  id: string;
  label: string;
  tone?: PaletteKey;
  destructive?: boolean;
  onPress: () => void;
};

export type ModalSheetProps = {
  visible: boolean;
  title?: string;
  description?: string;
  tone?: PaletteKey;
  children?: ReactNode;
  actions?: ModalSheetAction[];
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ModalSheet({
  visible,
  title,
  description,
  tone = 'security',
  children,
  actions,
  onClose,
  style,
}: ModalSheetProps) {
  const colors = palette[tone];
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>
      <View style={[styles.sheet, { backgroundColor: `${colors.backdrop}f2` }, style]}>
        <View style={styles.dragHandle} />
        {title ? <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text> : null}
        {description ? <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text> : null}
        {children ? <View style={styles.body}>{children}</View> : null}
        {actions && actions.length ? (
          <View style={styles.actions}>
            {actions.map((action) => {
              const actionTone = action.tone ?? tone;
              const actionColors = palette[actionTone];
              return (
                <Pressable
                  key={action.id}
                  onPress={action.onPress}
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: action.destructive
                        ? 'rgba(248, 113, 113, 0.18)'
                        : `${actionColors.accent}22`,
                      borderColor: `${actionColors.accent}50`,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.actionLabel,
                      action.destructive
                        ? styles.actionLabelDestructive
                        : actionLabelToneStyles[action.tone ?? tone],
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.select({ ios: 40, default: 20 }),
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    gap: 12,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.5)',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
  },
  body: {
    gap: 12,
  },
  actions: {
    marginTop: 4,
    gap: 10,
  },
  actionButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionLabel: {
    fontWeight: '700',
    fontSize: 16,
  },
  actionLabelDestructive: {
    color: '#f87171',
  },
});

const actionLabelToneStyles = (Object.keys(palette) as PaletteKey[]).reduce(
  (acc, key) => {
    acc[key] = { color: palette[key].accent } as TextStyle;
    return acc;
  },
  {} as Record<PaletteKey, TextStyle>,
);

