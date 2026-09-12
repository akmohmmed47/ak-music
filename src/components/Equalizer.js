import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../theme';

const BAR_HEIGHT = 16;

function Bar({ playing, delay, peak, color, width }) {
  const h = useSharedValue(0.3);

  useEffect(() => {
    if (playing) {
      h.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(peak, { duration: 320 + delay, easing: Easing.inOut(Easing.quad) }),
            withTiming(0.2, { duration: 380 + delay / 2, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          true
        )
      );
    } else {
      cancelAnimation(h);
      h.value = withTiming(0.28, { duration: 220 });
    }
    return () => cancelAnimation(h);
  }, [playing, delay, peak, h]);

  const style = useAnimatedStyle(() => ({
    height: Math.max(3, h.value * BAR_HEIGHT),
  }));

  return <Animated.View style={[styles.bar, { backgroundColor: color, width }, style]} />;
}

/** Three looping bars – shown on the currently playing song. */
export default function Equalizer({ playing, color = COLORS.accent, size = 'small' }) {
  const width = size === 'large' ? 4 : 3;
  return (
    <View style={[styles.wrap, { height: BAR_HEIGHT }]}>
      <Bar playing={playing} delay={0} peak={1} color={color} width={width} />
      <Bar playing={playing} delay={140} peak={0.7} color={color} width={width} />
      <Bar playing={playing} delay={70} peak={0.9} color={color} width={width} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  bar: {
    borderRadius: 2,
  },
});
