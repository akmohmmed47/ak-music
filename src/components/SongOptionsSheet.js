import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../theme';
import { extractArtistColor, getContrastText, getInitial, withAlpha } from '../utils/fileUtils';
import { formatDuration } from '../utils/timeUtils';
import { usePlayer } from '../context/PlayerContext';

function OptionRow({ icon, label, onPress, destructive, active }) {
  const color = destructive ? COLORS.danger : active ? COLORS.accent : COLORS.text;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.optionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Long-press / kebab context menu for a song.
 * Renders as a bottom sheet; the delete action asks for confirmation inline.
 */
export default function SongOptionsSheet({ song, onClose, onArtistPress }) {
  const insets = useSafeAreaInsets();
  const { playSong, playNext_queue, addToQueue, toggleFavorite, isFavorite, shareSong, deleteFromLibrary, library } = usePlayer();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!song) setConfirming(false);
  }, [song]);

  const visible = !!song;
  const fav = song ? isFavorite(song.id) : false;
  const color = song ? extractArtistColor(song.title) : COLORS.accent;

  const run = (fn) => () => {
    onClose();
    setTimeout(fn, 60);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]} onPress={() => {}}>
          <View style={styles.handle} />
          {song ? (
            <>
              <View style={styles.header}>
                <View style={[styles.art, { backgroundColor: color }]}>
                  <Text style={[styles.artLetter, { color: getContrastText(color) }]}>{getInitial(song.title)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.title}>
                    {song.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.subtitle}>
                    {song.artist}
                    {song.duration > 0 ? `  ·  ${formatDuration(song.duration)}` : ''}
                  </Text>
                </View>
              </View>

              {confirming ? (
                <View style={styles.confirmBox}>
                  <Text style={styles.confirmTitle}>Delete from Library?</Text>
                  <Text style={styles.confirmMessage}>
                    “{song.title}” will be removed from AkMusic. The original file in your Files app is not affected.
                  </Text>
                  <View style={styles.confirmActions}>
                    <Pressable onPress={() => setConfirming(false)} style={({ pressed }) => [styles.confirmBtn, styles.cancelBtn, pressed && { opacity: 0.8 }]}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={run(() => deleteFromLibrary(song.id))}
                      style={({ pressed }) => [styles.confirmBtn, styles.deleteBtn, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={styles.deleteText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.options}>
                  <OptionRow icon="play-circle-outline" label="Play Now" onPress={run(() => playSong(song, library))} />
                  <OptionRow icon="play-skip-forward-outline" label="Play Next" onPress={run(() => playNext_queue(song))} />
                  <OptionRow icon="list-outline" label="Add to Queue" onPress={run(() => addToQueue(song))} />
                  <OptionRow
                    icon={fav ? 'heart' : 'heart-outline'}
                    label={fav ? 'Remove from Favorites' : 'Add to Favorites'}
                    active={fav}
                    onPress={run(() => toggleFavorite(song.id))}
                  />
                  {onArtistPress && song.artist ? (
                    <OptionRow icon="person-outline" label="Go to Artist" onPress={run(() => onArtistPress(song.artist))} />
                  ) : null}
                  <OptionRow icon="share-outline" label="Share" onPress={run(() => shareSong(song))} />
                  <OptionRow icon="trash-outline" label="Delete from Library" destructive onPress={() => setConfirming(true)} />
                </View>
              )}
            </>
          ) : null}
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
    backgroundColor: COLORS.elevated,
    borderTopLeftRadius: RADIUS.large,
    borderTopRightRadius: RADIUS.large,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    marginBottom: SPACING.sm,
  },
  art: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artLetter: {
    fontSize: 22,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  options: {
    gap: 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingVertical: 14,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.medium,
  },
  optionPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  confirmBox: {
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  confirmMessage: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  deleteBtn: {
    backgroundColor: withAlpha(COLORS.danger, 0.9),
  },
  cancelText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  deleteText: {
    color: COLORS.text,
    fontWeight: '700',
  },
});
