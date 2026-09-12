import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, RADIUS, SHADOW, SPACING } from '../theme';
import { withAlpha } from '../utils/fileUtils';

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  icon = 'alert-circle-outline',
  onConfirm,
  onCancel,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={[styles.iconWrap, { backgroundColor: withAlpha(destructive ? COLORS.danger : COLORS.accent, 0.14) }]}>
            <Ionicons name={icon} size={28} color={destructive ? COLORS.danger : COLORS.accent} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [styles.button, destructive ? styles.destructive : styles.confirm, pressed && styles.pressed]}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.elevated,
    borderRadius: RADIUS.large,
    padding: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOW.card,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  confirm: {
    backgroundColor: COLORS.accent,
  },
  destructive: {
    backgroundColor: COLORS.danger,
  },
  pressed: {
    opacity: 0.8,
  },
  cancelText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 15,
  },
  confirmText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 15,
  },
});
