import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING, TYPO } from '../theme';
import { usePlayer } from '../context/PlayerContext';
import SongItem, { SONG_ITEM_HEIGHT } from '../components/SongItem';
import SongOptionsSheet from '../components/SongOptionsSheet';
import EmptyState from '../components/EmptyState';

const RECENT_KEY = '@akmusic/recentSearches';
const MAX_RECENT = 10;

function useRecentSearches() {
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecent(parsed.filter((s) => typeof s === 'string'));
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((list) => {
    setRecent(list);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(list)).catch(() => {});
  }, []);

  const add = useCallback(
    (term) => {
      const t = String(term || '').trim();
      if (!t) return;
      setRecent((prev) => {
        const next = [t, ...prev.filter((p) => p.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENT);
        AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  const remove = useCallback(
    (term) => {
      setRecent((prev) => {
        const next = prev.filter((p) => p !== term);
        AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { recent, add, remove, clear };
}

export default function SearchScreen({ navigation }) {
  const { library, currentSong, isPlaying, favoriteSet, playSong } = usePlayer();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [optionsSong, setOptionsSong] = useState(null);
  const inputRef = useRef(null);
  const { recent, add: addRecent, remove: removeRecent, clear: clearRecent } = useRecentSearches();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim().toLowerCase()), 120);
    return () => clearTimeout(t);
  }, [query]);

  const index = useMemo(() => library.map((song) => ({ song, key: `${song.title} ${song.artist}`.toLowerCase() })), [library]);

  const results = useMemo(() => {
    if (!debounced) return [];
    const tokens = debounced.split(/\s+/).filter(Boolean);
    const out = [];
    for (let i = 0; i < index.length; i++) {
      const entry = index[i];
      let ok = true;
      for (let t = 0; t < tokens.length; t++) {
        if (!entry.key.includes(tokens[t])) {
          ok = false;
          break;
        }
      }
      if (ok) out.push(entry.song);
    }
    // titles that *start* with the query float to the top
    out.sort((a, b) => {
      const aStarts = a.title.toLowerCase().startsWith(debounced) ? 0 : 1;
      const bStarts = b.title.toLowerCase().startsWith(debounced) ? 0 : 1;
      return aStarts - bStarts;
    });
    return out;
  }, [index, debounced]);

  const resultsRef = useRef(results);
  resultsRef.current = results;

  const currentId = currentSong ? currentSong.id : null;

  const handlePlay = useCallback(
    (song) => {
      playSong(song, resultsRef.current);
      if (query.trim()) addRecent(query.trim());
      Keyboard.dismiss();
    },
    [playSong, addRecent, query]
  );

  const handleSubmit = useCallback(() => {
    if (query.trim()) addRecent(query.trim());
  }, [query, addRecent]);

  const openOptions = useCallback((song) => setOptionsSong(song), []);
  const closeOptions = useCallback(() => setOptionsSong(null), []);

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

  const goToArtist = useCallback((artist) => navigation.navigate('ArtistDetail', { artist }), [navigation]);

  const showingResults = debounced.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      <View style={styles.inputWrap}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Songs, artists..."
          placeholderTextColor={COLORS.textDim}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="never"
          onSubmitEditing={handleSubmit}
          selectionColor={COLORS.accent}
          keyboardAppearance="dark"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {showingResults ? (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          getItemLayout={(_, i) => ({ length: SONG_ITEM_HEIGHT, offset: SONG_ITEM_HEIGHT * i, index: i })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={14}
          windowSize={9}
          removeClippedSubviews
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            results.length ? (
              <Text style={styles.count}>
                {results.length.toLocaleString()} result{results.length === 1 ? '' : 's'}
              </Text>
            ) : null
          }
          ListEmptyComponent={<EmptyState icon="pulse-outline" title={`No results for “${query.trim()}”`} message="Check the spelling or try the artist name." />}
        />
      ) : (
        <View style={styles.recentWrap}>
          {recent.length ? (
            <>
              <View style={styles.recentHeader}>
                <Text style={styles.sectionLabel}>Recent searches</Text>
                <Pressable onPress={clearRecent} hitSlop={8}>
                  <Text style={styles.clear}>Clear</Text>
                </Pressable>
              </View>
              {recent.map((term) => (
                <Pressable key={term} onPress={() => setQuery(term)} style={({ pressed }) => [styles.recentRow, pressed && styles.recentPressed]}>
                  <Ionicons name="time-outline" size={18} color={COLORS.textMuted} />
                  <Text style={styles.recentText} numberOfLines={1}>
                    {term}
                  </Text>
                  <Pressable onPress={() => removeRecent(term)} hitSlop={10} style={styles.recentRemove}>
                    <Ionicons name="close" size={16} color={COLORS.textDim} />
                  </Pressable>
                </Pressable>
              ))}
            </>
          ) : (
            <EmptyState
              icon="search-outline"
              title="Find your music"
              message={`Search across ${library.length.toLocaleString()} songs by title or artist.`}
            />
          )}
        </View>
      )}

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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    ...TYPO.titleLarge,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    height: 46,
    borderRadius: RADIUS.medium,
    backgroundColor: COLORS.elevated,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    height: '100%',
    paddingVertical: 0,
  },
  listContent: {
    paddingBottom: SPACING.xxl,
    flexGrow: 1,
  },
  count: {
    ...TYPO.caption,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  recentWrap: {
    flex: 1,
    paddingTop: SPACING.sm,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  sectionLabel: {
    ...TYPO.micro,
  },
  clear: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    height: 48,
  },
  recentPressed: {
    backgroundColor: COLORS.surface,
  },
  recentText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
  },
  recentRemove: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
