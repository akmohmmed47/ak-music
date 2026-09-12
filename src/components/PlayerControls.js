import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { COLORS, SHADOW } from '../theme';

export function PlayPauseButton({ isPlaying, onPress, size = 64, iconSize = 30, filled = true, color = COLORS.accent, iconColor = COLORS.text }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withSpring(0.88, { damping: 18, stiffness: 520, mass: 0.6 }),
      withSpring(1, { damping: 10, stiffness: 260, mass: 0.7 })
    );
    if (onPress) onPress();
  }, [onPress, scale]);

  return (
    <Pressable onPress={handlePress} hitSlop={6} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
      <Animated.View
        style={[
          styles.playButton,
          { width: size, height: size, borderRadius: size / 2 },
          filled ? { backgroundColor: color, ...SHADOW.glow } : null,
          animatedStyle,
        ]}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={iconSize}
          color={iconColor}
          style={!isPlaying ? { marginLeft: iconSize * 0.12 } : null}
        />
      </Animated.View>
    </Pressable>
  );
}

function ControlButton({ icon, onPress, active, size = 24, label, badge, disabled }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handle = useCallback(() => {
    scale.value = withSequence(withSpring(0.85, { damping: 20, stiffness: 600 }), withSpring(1, { damping: 12, stiffness: 300 }));
    if (onPress) onPress();
  }, [onPress, scale]);

  const color = disabled ? COLORS.textDim : active ? COLORS.accent : COLORS.textMuted;

  return (
    <Pressable onPress={handle} hitSlop={10} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={styles.controlButton}>
      <Animated.View style={[styles.controlInner, animatedStyle]}>
        <Ionicons name={icon} size={size} color={color} />
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
        {active ? <View style={styles.activeDot} /> : null}
      </Animated.View>
    </Pressable>
  );
}

export default function PlayerControls({
  isPlaying,
  shuffle,
  repeatMode,
  onPlayPause,
  onNext,
  onPrev,
  onShuffle,
  onRepeat,
  disabled = false,
}) {
  return (
    <View style={styles.row}>
      <ControlButton icon="shuffle" onPress={onShuffle} active={shuffle} label="Shuffle" disabled={disabled} />
      <ControlButton icon="play-skip-back" onPress={onPrev} size={30} label="Previous" disabled={disabled} />
      <PlayPauseButton isPlaying={isPlaying} onPress={onPlayPause} />
      <ControlButton icon="play-skip-forward" onPress={onNext} size={30} label="Next" disabled={disabled} />
      <ControlButton
        icon="repeat"
        onPress={onRepeat}
        active={repeatMode !== 'off'}
        badge={repeatMode === 'one' ? '1' : null}
        label="Repeat"
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  playButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: '700',
  },
  activeDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
});
