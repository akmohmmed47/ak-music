import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING, TYPO } from '../theme';
import { getIndexLetter, withAlpha } from '../utils/fileUtils';
import { formatLongDuration } from '../utils/timeUtils';
import { usePlayer } from '../context/PlayerContext';
import SongItem, { SONG_ITEM_HEIGHT } from '../components/SongItem';
import SongOptionsSheet from '../components/SongOptionsSheet';
import AlphabetIndex, { INDEX_LETTERS } from '../components/AlphabetIndex';
import EmptyState from '../components/EmptyState';

const SORTS = [
  { key: 'all', label: 'All' },
  { key: 'recent', label: 'Recently Added' },
  { key: 'az', label: 'A–Z' },
  { key: 'artist', label: 'Artist' },
  { key: 'favorites', label: 'Favorites', icon: 'heart' },
];

const collator = { sensitivity: 'base', numeric: true };

export default function LibraryScreen({ navigation }) {
  const { library, currentSong, isPlaying, favoriteSet, playSong, rescanLibrary, showToast, shuffle, toggleShuffle } = usePlayer();
  const [sort, setSort] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [optionsSong, setOptionsSong] = useState(null);
  const listRef = useRef(null);

  const songs = useMemo(() => {
    const list = sort === 'favorites' ? library.filter((s) => favoriteSet.has(s.id)) : library;
    switch (sort) {
      case 'recent':
        return list.slice().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
      case 'az':
        return list.slice().sort((a, b) => a.title.localeCompare(b.title, undefined, collator));
      case 'artist':
        return list
          .slice()
          .sort((a, b) => a.artist.localeCompare(b.artist, undefined, collator) || a.title.localeCompare(b.title, undefined, collator));
      default:
        return list;
    }
  }, [library, sort, favoriteSet]);

  const songsRef = useRef(songs);
  songsRef.current = songs;

  const showIndex = (sort === 'az' || sort === 'artist') && songs.length > 30;

  const letterMap = useMemo(() => {
    if (!showIndex) return null;
    const map = new Map();
    songs.forEach((s, i) => {
      const letter = getIndexLetter(sort === 'artist' ? s.artist : s.title);
      if (!map.has(letter)) map.set(letter, i);
    });
    return map;
  }, [songs, sort, showIndex]);

  const availableLetters = useMemo(() => (letterMap ? new Set(letterMap.keys()) : null), [letterMap]);

  const totalMs = useMemo(() => songs.reduce((sum, s) => sum + (s.duration || 0), 0), [songs]);

  const currentId = currentSong ? currentSong.id : null;

  const handlePlay = useCallback(
    (song) => {
      playSong(song, songsRef.current);
    },
    [playSong]
  );

  const openOptions = useCallback((song) => setOptionsSong(song), []);
  const closeOptions = useCallback(() => setOptionsSong(null), []);

  const handleShuffleAll = useCallback(() => {
    const list = songsRef.current;
    if (!list.length) return;
    if (!shuffle) toggleShuffle();
    const pick = list[Math.floor(Math.random() * list.length)];
    playSong(pick, list);
  }, [playSong, shuffle, toggleShuffle]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await rescanLibrary();
      if (res.removed > 0) showToast(`Removed ${res.removed} missing song${res.removed === 1 ? '' : 's'}`);
      else showToast('Library is up to date');
    } catch (e) {
      showToast("Couldn't re-scan library", 'error');
    } finally {
      setRefreshing(false);
    }
  }, [rescanLibrary, showToast]);

  const handleIndexSelect = useCallback(
    (letter) => {
      if (!letterMap || !listRef.current) return;
      let target = letter;
      if (!letterMap.has(target)) {
        const order = INDEX_LETTERS;
        const start = order.indexOf(letter);
        let found = null;
        for (let i = start; i < order.length; i++) {
          if (letterMap.has(order[i])) {
            found = order[i];
            break;
          }
        }
        if (!found) {
          for (let i = start; i >= 0; i--) {
            if (letterMap.has(order[i])) {
              found = order[i];
              break;
            }
          }
        }
        if (!found) return;
        target = found;
      }
      const index = letterMap.get(target);
      listRef.current.scrollToOffset({ offset: index * SONG_ITEM_HEIGHT, animated: false });
    },
    [letterMap]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <SongItem
        song={item}
        isCurrent={item.id === currentId}
        isPlaying={isPlaying && item.id === currentId}
        isFavorite={favoriteSet.has(item.id)}
        onPress={handlePlay}
        onLongPress={openOptions}
        onMenuPress={openOptions}
      />
    ),
    [currentId, isPlaying, favoriteSet, handlePlay, openOptions]
  );

  const keyExtractor = useCallback((item) => item.id, []);
  const getItemLayout = useCallback((_, index) => ({ length: SONG_ITEM_HEIGHT, offset: SONG_ITEM_HEIGHT * index, index }), []);

  const goToArtist = useCallback((artist) => navigation.navigate('ArtistDetail', { artist }), [navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Your Library</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{library.length.toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={handleShuffleAll} hitSlop={8} style={styles.iconBtn} accessibilityLabel="Shuffle all">
            <Ionicons name="shuffle" size={22} color={COLORS.text} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={8} style={styles.iconBtn} accessibilityLabel="Settings">
            <Ionicons name="settings-outline" size={22} color={COLORS.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
        {SORTS.map((s) => {
          const active = sort === s.key;
          return (
            <Pressable key={s.key} onPress={() => setSort(s.key)} style={[styles.chip, active && styles.chipActive]}>
              {s.icon ? <Ionicons name={s.icon} size={12} color={active ? COLORS.text : COLORS.textMuted} /> : null}
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.listWrap}>
        <FlatList
          ref={listRef}
          data={songs}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          initialNumToRender={14}
          maxToRenderPerBatch={16}
          windowSize={9}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} colors={[COLORS.accent]} />}
          contentContainerStyle={[styles.listContent, showIndex && { paddingRight: 24 }]}
          ListEmptyComponent={
            sort === 'favorites' ? (
              <EmptyState icon="heart-outline" title="No favorites yet" message="Tap the heart on Now Playing or long-press any song to add it here." />
            ) : (
              <EmptyState title="Your library is empty" message="Add songs from Settings to get started." actionLabel="Add Songs" onAction={() => navigation.navigate('Settings')} />
            )
          }
          ListFooterComponent={
            songs.length ? (
              <Text style={styles.footer}>
                {songs.length.toLocaleString()} song{songs.length === 1 ? '' : 's'}
                {totalMs > 0 ? `  ·  ${formatLongDuration(totalMs)}` : ''}
              </Text>
            ) : null
          }
        />
        {showIndex ? <AlphabetIndex available={availableLetters} onSelect={handleIndexSelect} /> : null}
      </View>

      <SongOptionsSheet song={optionsSong} onClose={closeOptions} onArtistPress={goToArtist} />
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
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
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chips: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.elevated,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
  },
  chipText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.text,
  },
  listWrap: {
    flex: 1,
  },
  listContent: {
    paddingBottom: SPACING.xxl,
    flexGrow: 1,
  },
  footer: {
    ...TYPO.caption,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
});
