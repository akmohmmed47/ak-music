import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SPACING } from '../theme';
import { withAlpha } from '../utils/fileUtils';

export default function EmptyState({ icon = 'musical-notes-outline', title, message, actionLabel, onAction, compact = false }) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={compact ? 28 : 40} color={COLORS.accent} />
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxxl,
    paddingVertical: SPACING.huge,
    gap: SPACING.sm,
  },
  wrapCompact: {
    paddingVertical: SPACING.xxl,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: withAlpha(COLORS.accent, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
  },
  buttonText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 15,
  },
});
