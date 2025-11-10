import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { palette, type PaletteKey } from '../theme';

export type Toast = {
  id: string;
  title: string;
  description?: string;
  tone?: PaletteKey;
  duration?: number;
};

type ToastContextValue = {
  show: (toast: Omit<Toast, 'id'> & { id?: string }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
  toasts: Toast[];
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export type ToastProviderProps = {
  children: ReactNode;
  maxToasts?: number;
  placement?: 'top' | 'bottom';
};

type TimerHandle = ReturnType<typeof setTimeout>;

export function ToastProvider({ children, maxToasts = 3, placement = 'top' }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, TimerHandle>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
    }
    timers.current.delete(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clear = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    setToasts([]);
  }, []);

  const show = useCallback(
    (toast: Omit<Toast, 'id'> & { id?: string }) => {
      const id = toast.id ?? Math.random().toString(36).slice(2);
      setToasts((prev) => {
        const next = [{ ...toast, id }, ...prev].slice(0, maxToasts);
        return next;
      });
      const duration = toast.duration ?? 4000;
      const timer: TimerHandle = setTimeout(() => {
        dismiss(id);
      }, duration);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss, maxToasts],
  );

  useEffect(() => () => clear(), [clear]);

  const value = useMemo(
    () => ({
      show,
      dismiss,
      clear,
      toasts,
    }),
    [show, dismiss, clear, toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport placement={placement} toasts={toasts} />
    </ToastContext.Provider>
  );
}

type ToastViewportProps = {
  placement: 'top' | 'bottom';
  toasts: Toast[];
};

function ToastViewport({ placement, toasts }: ToastViewportProps) {
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.viewport,
        placement === 'top' ? styles.viewportTop : styles.viewportBottom,
      ]}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

type ToastItemProps = {
  toast: Toast;
};

function ToastItem({ toast }: ToastItemProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translate, { toValue: 0, useNativeDriver: true }),
    ]).start();
  }, [opacity, translate]);

  const colors = palette[toast.tone ?? 'security'];

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: `${colors.backdrop}ee`,
          borderColor: `${colors.accent}55`,
          transform: [{ translateY: translate }],
          opacity,
        },
      ]}
    >
      <Text style={[styles.toastTitle, { color: colors.textPrimary }]}>{toast.title}</Text>
      {toast.description ? <Text style={[styles.toastBody, { color: colors.textSecondary }]}>{toast.description}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: 20,
    gap: 12,
    pointerEvents: 'box-none',
  },
  viewportTop: {
    top: Platform.select({ ios: 54, default: 24 }),
  },
  viewportBottom: {
    bottom: Platform.select({ ios: 40, default: 24 }),
  },
  toast: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    gap: 4,
  },
  toastTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  toastBody: {
    fontSize: 14,
    lineHeight: 20,
  },
});

