import React, { useCallback, useMemo } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING, TYPO } from '../theme';
import { formatLongDuration } from '../utils/timeUtils';
import { usePlayer } from '../context/PlayerContext';
import SongItem, { SONG_ITEM_HEIGHT } from './SongItem';
import EmptyState from './EmptyState';

export default function QueueSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { queue, currentIndex, currentSong, isPlaying, jumpToQueueIndex, removeFromQueue, clearUpcoming, shuffle, repeatMode, toggleShuffle, toggleRepeat } =
    usePlayer();

  const upcoming = useMemo(
    () => queue.slice(currentIndex + 1).map((song, i) => ({ song, queueIndex: currentIndex + 1 + i })),
    [queue, currentIndex]
  );

  const remainingMs = useMemo(() => upcoming.reduce((sum, u) => sum + (u.song.duration || 0), 0), [upcoming]);

  const renderItem = useCallback(
    ({ item }) => (
      <SongItem
        song={item.song}
        onPress={() => jumpToQueueIndex(item.queueIndex)}
        trailingIcon="close"
        onTrailingPress={() => removeFromQueue(item.queueIndex)}
      />
    ),
    [jumpToQueueIndex, removeFromQueue]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom }]} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Queue</Text>
              <Text style={styles.subtitle}>
                {upcoming.length} upcoming{remainingMs > 0 ? `  ·  ${formatLongDuration(remainingMs)}` : ''}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable onPress={toggleShuffle} hitSlop={8} style={styles.iconBtn}>
                <Ionicons name="shuffle" size={20} color={shuffle ? COLORS.accent : COLORS.textMuted} />
              </Pressable>
              <Pressable onPress={toggleRepeat} hitSlop={8} style={styles.iconBtn}>
                <Ionicons name="repeat" size={20} color={repeatMode !== 'off' ? COLORS.accent : COLORS.textMuted} />
                {repeatMode === 'one' ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>1</Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable onPress={onClose} hitSlop={8} style={styles.iconBtn}>
                <Ionicons name="chevron-down" size={24} color={COLORS.text} />
              </Pressable>
            </View>
          </View>

          {currentSong ? (
            <View>
              <Text style={styles.sectionLabel}>Now Playing</Text>
              <SongItem song={currentSong} isCurrent isPlaying={isPlaying} onMenuPress={() => {}} />
            </View>
          ) : null}

          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>Next Up</Text>
            {upcoming.length ? (
              <Pressable onPress={clearUpcoming} hitSlop={8}>
                <Text style={styles.clear}>Clear</Text>
              </Pressable>
            ) : null}
          </View>

          <FlatList
            data={upcoming}
            keyExtractor={(item) => `${item.song.id}-${item.queueIndex}`}
            renderItem={renderItem}
            getItemLayout={(_, index) => ({ length: SONG_ITEM_HEIGHT, offset: SONG_ITEM_HEIGHT * index, index })}
            style={styles.list}
            ListEmptyComponent={
              <EmptyState
                compact
                icon="list-outline"
                title="Nothing up next"
                message="Long-press a song and choose “Add to Queue” or “Play Next”."
              />
            }
            contentContainerStyle={{ paddingBottom: SPACING.lg }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '78%',
    backgroundColor: COLORS.elevated,
    borderTopLeftRadius: RADIUS.large,
    borderTopRightRadius: RADIUS.large,
    paddingTop: SPACING.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.text,
  },
  title: {
    ...TYPO.title,
  },
  subtitle: {
    ...TYPO.caption,
    marginTop: 2,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: SPACING.lg,
  },
  sectionLabel: {
    ...TYPO.micro,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  clear: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
    paddingTop: SPACING.md,
  },
  list: {
    flex: 1,
  },
});
