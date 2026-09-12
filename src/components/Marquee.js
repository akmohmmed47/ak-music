import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

const GAP = 56;

/** Single-line text that scrolls horizontally when it overflows. */
export default function Marquee({ text, style, containerStyle, speed = 32, align = 'center' }) {
  const [containerW, setContainerW] = useState(0);
  const [textW, setTextW] = useState(0);
  const x = useSharedValue(0);

  const shouldScroll = containerW > 0 && textW > containerW + 2;

  useEffect(() => {
    cancelAnimation(x);
    x.value = 0;
    if (shouldScroll) {
      const distance = textW + GAP;
      x.value = withRepeat(
        withSequence(
          withDelay(1600, withTiming(-distance, { duration: distance * speed, easing: Easing.linear })),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      );
    }
    return () => cancelAnimation(x);
  }, [shouldScroll, textW, text, speed, x]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.container, containerStyle]} onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}>
      {/* invisible measurer */}
      <Text style={[style, styles.measure]} numberOfLines={1} onLayout={(e) => setTextW(e.nativeEvent.layout.width)}>
        {text}
      </Text>
      {shouldScroll ? (
        <Animated.View style={[styles.row, animatedStyle]}>
          <Text style={style} numberOfLines={1}>
            {text}
          </Text>
          <View style={{ width: GAP }} />
          <Text style={style} numberOfLines={1}>
            {text}
          </Text>
        </Animated.View>
      ) : (
        <Text style={[style, { textAlign: align, width: '100%' }]} numberOfLines={1}>
          {text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  measure: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    top: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
