import React, { useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING, TYPO } from '../theme';
import { getGradientColors, getInitial, withAlpha } from '../utils/fileUtils';
import { usePlayer } from '../context/PlayerContext';
import EmptyState from '../components/EmptyState';

const UNKNOWN = 'Unknown Artist';
const collator = { sensitivity: 'base', numeric: true };

/** Group a library into artists (sorted A–Z, Unknown Artist last). */
export function groupByArtist(library) {
  const map = new Map();
  library.forEach((song) => {
    const name = song.artist || UNKNOWN;
    if (!map.has(name)) map.set(name, { name, songs: [] });
    map.get(name).songs.push(song);
  });
  return Array.from(map.values()).sort((a, b) => {
    if (a.name === UNKNOWN) return 1;
    if (b.name === UNKNOWN) return -1;
    return a.name.localeCompare(b.name, undefined, collator);
  });
}

function ArtistCard({ artist, size, isActive, onPress }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const colors = getGradientColors(artist.name);

  return (
    <Pressable
      onPress={() => onPress(artist)}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 18, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 260 });
      }}
      style={{ width: size }}
    >
      <Animated.View style={style}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.square, { width: size, height: size }]}>
          <Text style={styles.initial}>{getInitial(artist.name)}</Text>
          {isActive ? (
            <View style={styles.playingBadge}>
              <Ionicons name="volume-high" size={12} color={COLORS.text} />
            </View>
          ) : null}
        </LinearGradient>
        <Text numberOfLines={1} style={styles.name}>
          {artist.name}
        </Text>
        <Text style={styles.count}>
          {artist.songs.length} song{artist.songs.length === 1 ? '' : 's'}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function ArtistsScreen({ navigation }) {
  const { library, currentSong } = usePlayer();
  const { width } = useWindowDimensions();
  const artists = useMemo(() => groupByArtist(library), [library]);
  const cardSize = (Math.min(width, 600) - SPACING.lg * 2 - SPACING.lg) / 2;

  const handlePress = useCallback((artist) => navigation.navigate('ArtistDetail', { artist: artist.name }), [navigation]);

  const renderItem = useCallback(
    ({ item }) => (
      <ArtistCard artist={item} size={cardSize} isActive={!!currentSong && currentSong.artist === item.name} onPress={handlePress} />
    ),
    [cardSize, currentSong, handlePress]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Artists</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{artists.length.toLocaleString()}</Text>
        </View>
      </View>
      <FlatList
        data={artists}
        key="artists-2col"
        numColumns={2}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.content}
        initialNumToRender={10}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={<EmptyState icon="person-outline" title="No artists yet" message="Artists are grouped from your song filenames (Artist - Title)." />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  title: {
    ...TYPO.titleLarge,
  },
  badge: {
    backgroundColor: withAlpha(COLORS.accent, 0.18),
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  badgeText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.xl,
    flexGrow: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 600,
  },
  column: {
    justifyContent: 'space-between',
  },
  square: {
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 56,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.92)',
  },
  playingBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  count: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
