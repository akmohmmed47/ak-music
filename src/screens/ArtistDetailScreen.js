import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../theme';
import { getGradientColors, getInitial } from '../utils/fileUtils';
import { formatLongDuration } from '../utils/timeUtils';
import { usePlayer } from '../context/PlayerContext';
import SongItem, { SONG_ITEM_HEIGHT } from '../components/SongItem';
import SongOptionsSheet from '../components/SongOptionsSheet';
import EmptyState from '../components/EmptyState';

const collator = { sensitivity: 'base', numeric: true };

export default function ArtistDetailScreen({ route, navigation }) {
  const artist = route.params ? route.params.artist : '';
  const insets = useSafeAreaInsets();
  const { library, currentSong, isPlaying, favoriteSet, playSong, shuffle, toggleShuffle } = usePlayer();
  const [optionsSong, setOptionsSong] = useState(null);

  const songs = useMemo(
    () => library.filter((s) => s.artist === artist).sort((a, b) => a.title.localeCompare(b.title, undefined, collator)),
    [library, artist]
  );
  const totalMs = useMemo(() => songs.reduce((sum, s) => sum + (s.duration || 0), 0), [songs]);
  const currentId = currentSong ? currentSong.id : null;
  const colors = getGradientColors(artist);

  const handlePlay = useCallback((song) => playSong(song, songs), [playSong, songs]);
  const openOptions = useCallback((song) => setOptionsSong(song), []);
  const closeOptions = useCallback(() => setOptionsSong(null), []);

  const playAll = useCallback(() => {
    if (!songs.length) return;
    if (shuffle) toggleShuffle();
    playSong(songs[0], songs);
  }, [songs, shuffle, toggleShuffle, playSong]);

  const shuffleAll = useCallback(() => {
    if (!songs.length) return;
    if (!shuffle) toggleShuffle();
    playSong(songs[Math.floor(Math.random() * songs.length)], songs);
  }, [songs, shuffle, toggleShuffle, playSong]);

  const renderItem = useCallback(
    ({ item }) => (
      <SongItem
        song={item}
        isCurrent={item.id === currentId}
        isPlaying={isPlaying && item.id === currentId}
        isFavorite={favoriteSet.has(item.id)}
        showArtist={false}
        onPress={handlePlay}
        onLongPress={openOptions}
        onMenuPress={openOptions}
      />
    ),
    [currentId, isPlaying, favoriteSet, handlePlay, openOptions]
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        getItemLayout={(_, i) => ({ length: SONG_ITEM_HEIGHT, offset: SONG_ITEM_HEIGHT * i, index: i })}
        initialNumToRender={14}
        windowSize={9}
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xxl }}
        ListHeaderComponent={
          <LinearGradient colors={[colors[0], colors[1], COLORS.bg]} locations={[0, 0.6, 1]} style={[styles.hero, { paddingTop: insets.top + SPACING.sm }]}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.back} accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={26} color={COLORS.text} />
            </Pressable>
            <View style={styles.heroBody}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitial(artist)}</Text>
              </View>
              <Text style={styles.name} numberOfLines={2}>
                {artist}
              </Text>
              <Text style={styles.meta}>
                {songs.length.toLocaleString()} song{songs.length === 1 ? '' : 's'}
                {totalMs > 0 ? `  ·  ${formatLongDuration(totalMs)}` : ''}
              </Text>
              <View style={styles.actions}>
                <Pressable onPress={playAll} style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
                  <Ionicons name="play" size={18} color={COLORS.text} />
                  <Text style={styles.primaryText}>Play</Text>
                </Pressable>
                <Pressable onPress={shuffleAll} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                  <Ionicons name="shuffle" size={18} color={COLORS.text} />
                  <Text style={styles.secondaryText}>Shuffle</Text>
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        }
        ListEmptyComponent={<EmptyState icon="person-outline" title="No songs" message="This artist has no songs in your library anymore." />}
      />
      <SafeAreaView edges={['bottom']} style={styles.bottomSafe} />
      <SongOptionsSheet song={optionsSong} onClose={closeOptions} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  bottomSafe: {
    backgroundColor: COLORS.bg,
  },
  hero: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -SPACING.sm,
  },
  heroBody: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: {
    fontSize: 56,
    fontWeight: '800',
    color: COLORS.text,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.lg,
    letterSpacing: -0.5,
  },
  meta: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: SPACING.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xxl,
    height: 44,
    borderRadius: RADIUS.pill,
  },
  primaryText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: SPACING.xl,
    height: 44,
    borderRadius: RADIUS.pill,
  },
  secondaryText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.85,
  },
});
