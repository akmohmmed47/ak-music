import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING } from '../theme';
import { extractArtistColor, getContrastText, getInitial } from '../utils/fileUtils';
import { usePlayer, usePlayerProgress } from '../context/PlayerContext';
import { PlayPauseButton } from './PlayerControls';
import Equalizer from './Equalizer';

export const MINI_PLAYER_HEIGHT = 64;

export default function MiniPlayer() {
  const navigation = useNavigation();
  const { currentSong, isPlaying, pauseResume, playNext } = usePlayer();
  const { position, duration, isBuffering } = usePlayerProgress();

  const translateY = useSharedValue(MINI_PLAYER_HEIGHT + 20);
  const opacity = useSharedValue(0);
  const width = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 17, stiffness: 170, mass: 0.9 });
    opacity.value = withTiming(1, { duration: 260 });
  }, [translateY, opacity]);

  useEffect(() => {
    const ratio = duration > 0 ? Math.min(1, position / duration) : 0;
    progress.value = withTiming(ratio, { duration: 450 });
  }, [position, duration, progress]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: progress.value * width.value,
  }));

  if (!currentSong) return null;

  const color = extractArtistColor(currentSong.title);

  return (
    <Animated.View
      style={[styles.wrap, containerStyle]}
      onLayout={(e) => {
        width.value = e.nativeEvent.layout.width;
      }}
    >
      <Pressable
        onPress={() => navigation.navigate('NowPlaying')}
        style={({ pressed }) => [styles.inner, pressed && { backgroundColor: '#2F2F2F' }]}
        accessibilityRole="button"
        accessibilityLabel="Open Now Playing"
      >
        <View style={[styles.art, { backgroundColor: color }]}>
          {isPlaying ? (
            <View style={styles.artOverlay}>
              <Equalizer playing color="#FFFFFF" />
            </View>
          ) : (
            <Text style={[styles.artLetter, { color: getContrastText(color) }]}>{getInitial(currentSong.title)}</Text>
          )}
        </View>
        <View style={styles.meta}>
          <Text numberOfLines={1} style={styles.title}>
            {currentSong.title}
          </Text>
          <Text numberOfLines={1} style={styles.artist}>
            {isBuffering ? 'Loading…' : currentSong.artist}
          </Text>
        </View>
        <View style={styles.controls}>
          <PlayPauseButton isPlaying={isPlaying} onPress={pauseResume} size={40} iconSize={24} filled={false} iconColor={COLORS.text} />
          <Pressable onPress={playNext} hitSlop={8} style={styles.nextBtn} accessibilityLabel="Next">
            <Ionicons name="play-skip-forward" size={24} color={COLORS.text} />
          </Pressable>
        </View>
      </Pressable>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, barStyle]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: MINI_PLAYER_HEIGHT,
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: RADIUS.medium,
    backgroundColor: COLORS.elevated,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.xs,
    gap: SPACING.md,
  },
  art: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.small,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artLetter: {
    fontSize: 18,
    fontWeight: '700',
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: 2,
    backgroundColor: COLORS.accent,
  },
});
