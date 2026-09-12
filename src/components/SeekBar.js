import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { COLORS } from '../theme';

function clamp01(v) {
  'worklet';

  return Math.max(0, Math.min(1, v));
}

/**
 * Generic horizontal slider. `value` is 0..1.
 * Used for the Now Playing seek bar and the volume slider.
 */
export default function SeekBar({
  value = 0,
  onSeek,
  onSeekStart,
  onSeekEnd,
  onPreview,
  disabled = false,
  height = 4,
  thumbSize = 14,
  trackColor = 'rgba(255,255,255,0.18)',
  fillColor = COLORS.text,
  thumbColor = COLORS.text,
  activeFillColor = COLORS.accent,
  style,
}) {
  const width = useSharedValue(1);
  const progress = useSharedValue(clamp01(value));
  const dragging = useSharedValue(0);

  useEffect(() => {
    if (dragging.value === 0) {
      progress.value = withTiming(clamp01(value), { duration: 220 });
    }
  }, [value, dragging, progress]);

  const start = () => onSeekStart && onSeekStart();
  const preview = (v) => onPreview && onPreview(v);
  const commit = (v) => {
    if (onSeek) onSeek(v);
    if (onSeekEnd) onSeekEnd();
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-4, 4])
    .failOffsetY([-14, 14])
    .onStart((e) => {
      dragging.value = 1;
      progress.value = clamp01(e.x / width.value);
      runOnJS(start)();
      runOnJS(preview)(progress.value);
    })
    .onUpdate((e) => {
      progress.value = clamp01(e.x / width.value);
      runOnJS(preview)(progress.value);
    })
    .onEnd(() => {
      runOnJS(commit)(progress.value);
    })
    .onFinalize(() => {
      dragging.value = 0;
    });

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .maxDuration(400)
    .onEnd((e) => {
      const v = clamp01(e.x / width.value);
      progress.value = withTiming(v, { duration: 120 });
      runOnJS(commit)(v);
    });

  const gesture = Gesture.Race(pan, tap);

  const fillStyle = useAnimatedStyle(() => ({
    width: progress.value * width.value,
    backgroundColor: dragging.value ? activeFillColor : fillColor,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * width.value - thumbSize / 2 },
      { scale: withSpring(dragging.value ? 1.5 : 1, { damping: 14, stiffness: 220 }) },
    ],
    opacity: disabled ? 0 : 1,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[styles.hitArea, style]}
        onLayout={(e) => {
          width.value = Math.max(1, e.nativeEvent.layout.width);
        }}
      >
        <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}>
          <Animated.View style={[styles.fill, { height, borderRadius: height / 2 }, fillStyle]} />
        </View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: thumbColor,
              top: (32 - thumbSize) / 2,
            },
            thumbStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    height: 32,
    justifyContent: 'center',
    width: '100%',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
