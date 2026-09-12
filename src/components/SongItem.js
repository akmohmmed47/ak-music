import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING } from '../theme';
import { extractArtistColor, getContrastText, getInitial, withAlpha } from '../utils/fileUtils';
import { formatDuration } from '../utils/timeUtils';
import Equalizer from './Equalizer';

export const SONG_ITEM_HEIGHT = 64;

function SongItem({
  song,
  isCurrent = false,
  isPlaying = false,
  isFavorite = false,
  onPress,
  onLongPress,
  onMenuPress,
  trailingIcon,
  onTrailingPress,
  showArtist = true,
  subtitle,
}) {
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const color = extractArtistColor(song.title);

  const handlePress = useCallback(() => {
    opacity.value = withSequence(withTiming(0.35, { duration: 60 }), withTiming(1, { duration: 260 }));
    if (onPress) onPress(song);
  }, [onPress, song, opacity]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) onLongPress(song);
  }, [onLongPress, song]);

  const handleMenu = useCallback(() => {
    if (onMenuPress) onMenuPress(song);
  }, [onMenuPress, song]);

  const handleTrailing = useCallback(() => {
    if (onTrailingPress) onTrailingPress(song);
  }, [onTrailingPress, song]);

  const secondary = subtitle != null ? subtitle : showArtist ? song.artist : null;

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={320}
        style={({ pressed }) => [styles.row, isCurrent && styles.rowCurrent, pressed && styles.rowPressed]}
      >
        <View style={[styles.art, { backgroundColor: color }]}>
          {isCurrent ? (
            <View style={[styles.artOverlay, { backgroundColor: withAlpha('#000000', 0.45) }]}>
              <Equalizer playing={isPlaying} color="#FFFFFF" />
            </View>
          ) : (
            <Text style={[styles.artLetter, { color: getContrastText(color) }]}>{getInitial(song.title)}</Text>
          )}
        </View>

        <View style={styles.meta}>
          <Text numberOfLines={1} style={[styles.title, isCurrent && styles.titleCurrent]}>
            {song.title}
          </Text>
          {secondary ? (
            <View style={styles.subRow}>
              {isFavorite ? <Ionicons name="heart" size={11} color={COLORS.accent} style={styles.favIcon} /> : null}
              <Text numberOfLines={1} style={styles.artist}>
                {secondary}
              </Text>
            </View>
          ) : null}
        </View>

        {song.duration > 0 ? <Text style={styles.duration}>{formatDuration(song.duration)}</Text> : null}

        {trailingIcon ? (
          <Pressable hitSlop={10} onPress={handleTrailing} style={styles.kebab}>
            <Ionicons name={trailingIcon} size={20} color={COLORS.textMuted} />
          </Pressable>
        ) : (
          <Pressable hitSlop={10} onPress={handleMenu} style={styles.kebab}>
            <Ionicons name="ellipsis-vertical" size={18} color={COLORS.textMuted} />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

function areEqual(prev, next) {
  return (
    prev.song === next.song &&
    prev.isCurrent === next.isCurrent &&
    prev.isPlaying === next.isPlaying &&
    prev.isFavorite === next.isFavorite &&
    prev.onPress === next.onPress &&
    prev.onLongPress === next.onLongPress &&
    prev.onMenuPress === next.onMenuPress &&
    prev.trailingIcon === next.trailingIcon &&
    prev.onTrailingPress === next.onTrailingPress &&
    prev.showArtist === next.showArtist &&
    prev.subtitle === next.subtitle
  );
}

export default React.memo(SongItem, areEqual);

const styles = StyleSheet.create({
  row: {
    height: SONG_ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  rowCurrent: {
    backgroundColor: withAlpha(COLORS.accent, 0.08),
  },
  rowPressed: {
    backgroundColor: COLORS.surface,
  },
  art: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.small,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artLetter: {
    fontSize: 20,
    fontWeight: '700',
  },
  meta: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  titleCurrent: {
    color: COLORS.accent,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favIcon: {
    marginRight: 4,
  },
  artist: {
    fontSize: 13,
    color: COLORS.textMuted,
    flexShrink: 1,
  },
  duration: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontVariant: ['tabular-nums'],
  },
  kebab: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
