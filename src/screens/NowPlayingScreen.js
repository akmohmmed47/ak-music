import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, SPACING, TYPO } from '../theme';
import { extractArtistColor, getGradientColors, getInitial, shadeColor } from '../utils/fileUtils';
import { formatDuration } from '../utils/timeUtils';
import { usePlayer, usePlayerProgress } from '../context/PlayerContext';
import SeekBar from '../components/SeekBar';
import PlayerControls from '../components/PlayerControls';
import Marquee from '../components/Marquee';
import QueueSheet from '../components/QueueSheet';
import EmptyState from '../components/EmptyState';

const ROTATION_DURATION = 20000;

/**
 * Album art: rounded square whose gradient slowly sweeps around while playing.
 * The silhouette stays fixed (a spinning square looks broken), the colour rotates.
 */
function AlbumArt({ song, isPlaying, size }) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const colors = getGradientColors(song.title);
  const glow = extractArtistColor(song.title);

  useEffect(() => {
    scale.value = 0.78;
    scale.value = withSpring(1, { damping: 11, stiffness: 170, mass: 0.9 });
  }, [song.id, scale]);

  useEffect(() => {
    if (isPlaying) {
      rotation.value = withRepeat(withTiming(rotation.value + 360, { duration: ROTATION_DURATION, easing: Easing.linear }), -1, false);
    } else {
      cancelAnimation(rotation);
    }
    return () => cancelAnimation(rotation);
  }, [isPlaying, rotation]);

  const wrapStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const gradientStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value % 360}deg` }] }));

  const inner = size * 1.45;

  return (
    <Animated.View
      style={[
        styles.art,
        {
          width: size,
          height: size,
          shadowColor: glow,
        },
        wrapStyle,
      ]}
    >
      <View style={[styles.artClip, { width: size, height: size }]}>
        <Animated.View style={[{ position: 'absolute', width: inner, height: inner, left: (size - inner) / 2, top: (size - inner) / 2 }, gradientStyle]}>
          <LinearGradient colors={[colors[0], colors[1], shadeColor(colors[0], -0.2)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
        </Animated.View>
        <LinearGradient
          colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.25)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.artLetterWrap} pointerEvents="none">
          <Text style={[styles.artLetter, { fontSize: size * 0.42 }]}>{getInitial(song.title)}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function HeartButton({ active, onPress }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handle = () => {
    scale.value = withSequence(withSpring(1.35, { damping: 8, stiffness: 400 }), withSpring(1, { damping: 10, stiffness: 240 }));
    onPress();
  };
  return (
    <Pressable onPress={handle} hitSlop={10} style={styles.headerBtn} accessibilityLabel={active ? 'Remove from favorites' : 'Add to favorites'}>
      <Animated.View style={style}>
        <Ionicons name={active ? 'heart' : 'heart-outline'} size={26} color={active ? COLORS.accent : COLORS.text} />
      </Animated.View>
    </Pressable>
  );
}

export default function NowPlayingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const {
    currentSong,
    isPlaying,
    shuffle,
    repeatMode,
    queue,
    currentIndex,
    volume,
    pauseResume,
    playNext,
    playPrev,
    seekTo,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
    isFavorite,
    setVolume,
    shareSong,
  } = usePlayer();
  const { position, duration, isBuffering } = usePlayerProgress();

  const [dragging, setDragging] = useState(false);
  const [dragMs, setDragMs] = useState(0);
  const [queueOpen, setQueueOpen] = useState(false);

  const compact = height < 720;
  const artSize = Math.min(300, width - SPACING.huge * 2, compact ? height * 0.34 : 300);

  const progressValue = duration > 0 ? Math.min(1, position / duration) : 0;
  const shownPosition = dragging ? dragMs : position;

  const onPreview = useCallback((frac) => setDragMs(frac * duration), [duration]);
  const onSeekStart = useCallback(() => setDragging(true), []);
  const onSeekEnd = useCallback(() => setDragging(false), []);
  const onSeek = useCallback((frac) => seekTo(frac * duration), [seekTo, duration]);

  const gradientColors = useMemo(() => {
    if (!currentSong) return [COLORS.accentSoft, COLORS.bg, COLORS.bg];
    const base = extractArtistColor(currentSong.title);
    return [shadeColor(base, -0.35), shadeColor(COLORS.accentSoft, -0.55), COLORS.bg];
  }, [currentSong]);

  if (!currentSong) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar hidden />
        <EmptyState icon="musical-notes-outline" title="Nothing playing" message="Pick a song from your library to get started." actionLabel="Back to Library" onAction={() => navigation.goBack()} />
      </View>
    );
  }

  const fav = isFavorite(currentSong.id);

  return (
    <LinearGradient colors={gradientColors} locations={[0, 0.55, 1]} style={styles.root}>
      <StatusBar hidden />
      <View style={[styles.container, { paddingTop: Math.max(insets.top, SPACING.md), paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.headerBtn} accessibilityLabel="Close">
            <Ionicons name="chevron-down" size={28} color={COLORS.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerMicro}>Now Playing</Text>
            <Text style={styles.headerCaption}>
              {queue.length > 1 ? `${currentIndex + 1} of ${queue.length.toLocaleString()}` : 'Your Library'}
            </Text>
          </View>
          <HeartButton active={fav} onPress={() => toggleFavorite(currentSong.id)} />
        </View>

        {/* Art */}
        <View style={styles.artArea}>
          <AlbumArt song={currentSong} isPlaying={isPlaying} size={artSize} />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Marquee text={currentSong.title} style={styles.songTitle} align="left" />
          <Text style={styles.artist} numberOfLines={1}>
            {isBuffering ? 'Loading…' : currentSong.artist}
          </Text>
        </View>

        {/* Seek */}
        <View style={styles.seekWrap}>
          <SeekBar
            value={progressValue}
            onSeek={onSeek}
            onSeekStart={onSeekStart}
            onSeekEnd={onSeekEnd}
            onPreview={onPreview}
            disabled={duration <= 0}
            fillColor={COLORS.text}
            activeFillColor={COLORS.accent}
          />
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatDuration(shownPosition)}</Text>
            <Text style={styles.time}>{duration > 0 ? formatDuration(duration) : '--:--'}</Text>
          </View>
        </View>

        {/* Controls */}
        <PlayerControls
          isPlaying={isPlaying}
          shuffle={shuffle}
          repeatMode={repeatMode}
          onPlayPause={pauseResume}
          onNext={playNext}
          onPrev={playPrev}
          onShuffle={toggleShuffle}
          onRepeat={toggleRepeat}
        />

        {/* Volume */}
        <View style={styles.volumeRow}>
          <Pressable onPress={() => setVolume(0)} hitSlop={8}>
            <Ionicons name={volume === 0 ? 'volume-mute' : 'volume-low'} size={18} color={COLORS.textMuted} />
          </Pressable>
          <View style={styles.volumeBar}>
            <SeekBar value={volume} onSeek={setVolume} onPreview={setVolume} height={3} thumbSize={12} fillColor={COLORS.textMuted} activeFillColor={COLORS.accent} thumbColor={COLORS.text} />
          </View>
          <Pressable onPress={() => setVolume(1)} hitSlop={8}>
            <Ionicons name="volume-high" size={18} color={COLORS.textMuted} />
          </Pressable>
        </View>

        {/* Bottom actions */}
        <View style={styles.bottomRow}>
          <Pressable onPress={() => shareSong(currentSong)} hitSlop={10} style={styles.bottomBtn} accessibilityLabel="Share">
            <Ionicons name="share-outline" size={22} color={COLORS.textMuted} />
          </Pressable>
          <View style={styles.modeHint}>
            {shuffle ? <Text style={styles.modeText}>Shuffle</Text> : null}
            {shuffle && repeatMode !== 'off' ? <Text style={styles.modeDot}>·</Text> : null}
            {repeatMode !== 'off' ? <Text style={styles.modeText}>{repeatMode === 'one' ? 'Repeat one' : 'Repeat all'}</Text> : null}
          </View>
          <Pressable onPress={() => setQueueOpen(true)} hitSlop={10} style={styles.bottomBtn} accessibilityLabel="Queue">
            <Ionicons name="list" size={24} color={COLORS.textMuted} />
            {queue.length - currentIndex - 1 > 0 ? (
              <View style={styles.queueBadge}>
                <Text style={styles.queueBadgeText}>{Math.min(99, queue.length - currentIndex - 1)}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      <QueueSheet visible={queueOpen} onClose={() => setQueueOpen(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  headerMicro: {
    ...TYPO.micro,
    color: 'rgba(255,255,255,0.7)',
  },
  headerCaption: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  artArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  art: {
    borderRadius: 24,
    shadowOpacity: 0.55,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
  artClip: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  artLetterWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artLetter: {
    fontWeight: '800',
    color: 'rgba(255,255,255,0.95)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
    includeFontPadding: false,
  },
  info: {
    marginTop: SPACING.lg,
    gap: SPACING.xs,
  },
  songTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  artist: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  seekWrap: {
    marginTop: SPACING.md,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -2,
  },
  time: {
    ...TYPO.caption,
    fontVariant: ['tabular-nums'],
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  volumeBar: {
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  bottomBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeText: {
    ...TYPO.micro,
    color: COLORS.accent,
  },
  modeDot: {
    color: COLORS.textDim,
  },
  queueBadge: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueBadgeText: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: '700',
  },
});
