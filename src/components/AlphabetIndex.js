import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { COLORS, SHADOW } from '../theme';

export const INDEX_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

/**
 * iOS-style fast-scroll index. `available` is a Set of letters that exist in
 * the list; others render dimmed but still snap to the nearest available one.
 */
export default function AlphabetIndex({ available, onSelect, style }) {
  const [active, setActive] = useState(null);
  const height = useSharedValue(1);
  const bubbleY = useSharedValue(0);
  const touching = useSharedValue(0);

  const select = useCallback(
    (letter) => {
      setActive(letter);
      if (onSelect) onSelect(letter);
    },
    [onSelect]
  );
  const release = useCallback(() => setActive(null), []);

  const letterFromY = (y) => {
    'worklet';

    const n = INDEX_LETTERS.length;
    const idx = Math.max(0, Math.min(n - 1, Math.floor((y / height.value) * n)));
    return { letter: INDEX_LETTERS[idx], idx };
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      touching.value = 1;
      const { letter, idx } = letterFromY(e.y);
      bubbleY.value = (idx + 0.5) * (height.value / INDEX_LETTERS.length);
      runOnJS(select)(letter);
    })
    .onUpdate((e) => {
      const { letter, idx } = letterFromY(e.y);
      bubbleY.value = (idx + 0.5) * (height.value / INDEX_LETTERS.length);
      runOnJS(select)(letter);
    })
    .onFinalize(() => {
      touching.value = 0;
      runOnJS(release)();
    });

  const bubbleStyle = useAnimatedStyle(() => ({
    top: bubbleY.value - 22,
    opacity: withTiming(touching.value ? 1 : 0, { duration: 120 }),
    transform: [{ scale: withSpring(touching.value ? 1 : 0.6, { damping: 14, stiffness: 260 }) }],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.wrap, style]}>
      <Animated.View pointerEvents="none" style={[styles.bubble, bubbleStyle]}>
        <Text style={styles.bubbleText}>{active || ''}</Text>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <View
          style={styles.column}
          onLayout={(e) => {
            height.value = Math.max(1, e.nativeEvent.layout.height);
          }}
        >
          {INDEX_LETTERS.map((l) => {
            const has = available ? available.has(l) : true;
            const isActive = active === l;
            return (
              <View key={l} style={styles.letterCell}>
                <Text style={[styles.letter, !has && styles.letterDim, isActive && styles.letterActive]}>{l}</Text>
              </View>
            );
          })}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    width: 44,
  },
  column: {
    position: 'absolute',
    right: 0,
    top: 8,
    bottom: 8,
    width: 26,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  letterCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
  },
  letter: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  letterDim: {
    color: COLORS.textDim,
  },
  letterActive: {
    color: COLORS.accent,
  },
  bubble: {
    position: 'absolute',
    right: 34,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.glow,
  },
  bubbleText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
});
