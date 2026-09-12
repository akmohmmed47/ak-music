import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { COLORS, RADIUS, SHADOW, SPACING } from '../theme';
import { usePlayer } from '../context/PlayerContext';

export default function Toast() {
  const { toast, hideToast } = usePlayer();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (toast) {
      translateY.value = 40;
      translateY.value = withSpring(0, { damping: 16, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 160 });
    } else {
      translateY.value = withTiming(30, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [toast, translateY, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 132 }, style]}>
      <Pressable onPress={hideToast} style={[styles.toast, isError && styles.toastError]}>
        <Ionicons
          name={isError ? 'alert-circle' : 'checkmark-circle'}
          size={18}
          color={isError ? COLORS.danger : COLORS.accent}
        />
        <Text style={styles.text} numberOfLines={2}>
          {toast.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.elevated,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...SHADOW.card,
  },
  toastError: {
    borderColor: 'rgba(230,71,71,0.35)',
  },
  text: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
});
