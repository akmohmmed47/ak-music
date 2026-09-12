import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING, TYPO } from '../theme';
import { formatBytes, isManagedUri, withAlpha } from '../utils/fileUtils';
import { formatLongDuration } from '../utils/timeUtils';
import { usePlayer } from '../context/PlayerContext';
import { groupByArtist } from './ArtistsScreen';
import ConfirmDialog from '../components/ConfirmDialog';

function Row({ icon, label, description, onPress, destructive, right, disabled }) {
  const color = destructive ? COLORS.danger : COLORS.text;
  return (
    <Pressable onPress={onPress} disabled={disabled || !onPress} style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed, disabled && { opacity: 0.5 }]}>
      <View style={[styles.rowIcon, { backgroundColor: withAlpha(destructive ? COLORS.danger : COLORS.accent, 0.14) }]}>
        <Ionicons name={icon} size={20} color={destructive ? COLORS.danger : COLORS.accent} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, { color }]}>{label}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      {right !== undefined ? right : onPress ? <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} /> : null}
    </Pressable>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const { library, favorites, pickAndImport, rescanLibrary, clearLibrary, showToast, shuffle, repeatMode, toggleShuffle, toggleRepeat } = usePlayer();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [rescanning, setRescanning] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const barWidth = useSharedValue(0);
  const barStyle = useAnimatedStyle(() => ({ width: `${Math.round(barWidth.value * 100)}%` }));

  const stats = useMemo(() => {
    const artists = groupByArtist(library).length;
    const totalMs = library.reduce((sum, s) => sum + (s.duration || 0), 0);
    const withDuration = library.filter((s) => s.duration > 0).length;
    const bytes = library.filter((s) => isManagedUri(s.uri)).reduce((sum, s) => sum + (s.size || 0), 0);
    return { artists, totalMs, withDuration, bytes };
  }, [library]);

  const handleImport = async () => {
    if (importing) return;
    setImporting(true);
    setProgress({ done: 0, total: 0 });
    barWidth.value = 0;
    try {
      const res = await pickAndImport((done, total) => {
        setProgress({ done, total });
        barWidth.value = withTiming(total > 0 ? done / total : 0, { duration: 200 });
      });
      if (res.canceled) return;
      if (res.added === 0) {
        showToast(res.skipped > 0 ? 'All of those songs are already in your library' : 'No audio files were found', 'error');
      } else {
        showToast(`Added ${res.added.toLocaleString()} song${res.added === 1 ? '' : 's'}${res.skipped ? ` (${res.skipped} duplicates skipped)` : ''}`);
      }
    } catch (e) {
      showToast('Import failed. Please try again.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleRescan = async () => {
    if (rescanning) return;
    setRescanning(true);
    try {
      const res = await rescanLibrary();
      showToast(res.removed > 0 ? `Removed ${res.removed} missing song${res.removed === 1 ? '' : 's'}` : 'Library is up to date');
    } catch (e) {
      showToast("Couldn't re-scan library", 'error');
    } finally {
      setRescanning(false);
    }
  };

  const handleClear = async () => {
    setConfirmClear(false);
    await clearLibrary();
  };

  const repeatLabel = repeatMode === 'off' ? 'Off' : repeatMode === 'all' ? 'All' : 'One';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.back} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsCard}>
          <Stat value={library.length.toLocaleString()} label="Songs" />
          <View style={styles.statDivider} />
          <Stat value={stats.artists.toLocaleString()} label="Artists" />
          <View style={styles.statDivider} />
          <Stat value={favorites.length.toLocaleString()} label="Favorites" />
          <View style={styles.statDivider} />
          <Stat value={stats.totalMs > 0 ? formatLongDuration(stats.totalMs) : '—'} label={stats.withDuration < library.length ? 'Played time' : 'Total time'} />
        </View>

        <Text style={styles.sectionLabel}>Library</Text>
        <View style={styles.group}>
          <Row
            icon="add-circle-outline"
            label="Add More Songs"
            description={Platform.OS === 'ios' ? 'Pick files from Files → On My iPhone → VLC' : 'Pick audio files from your device'}
            onPress={handleImport}
            disabled={importing}
            right={importing ? <ActivityIndicator color={COLORS.accent} /> : undefined}
          />
          {importing ? (
            <View style={styles.progressWrap}>
              <Text style={styles.progressText}>
                {progress.total > 0 ? `Scanning ${progress.done.toLocaleString()} of ${progress.total.toLocaleString()} songs…` : 'Waiting for files…'}
              </Text>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, barStyle]} />
              </View>
            </View>
          ) : null}
          <View style={styles.separator} />
          <Row
            icon="refresh-outline"
            label="Re-scan Library"
            description="Refresh titles and remove files that no longer exist"
            onPress={handleRescan}
            disabled={rescanning}
            right={rescanning ? <ActivityIndicator color={COLORS.accent} /> : undefined}
          />
        </View>

        <Text style={styles.sectionLabel}>Playback</Text>
        <View style={styles.group}>
          <Row
            icon="shuffle"
            label="Shuffle"
            description="Randomize the order of your queue"
            onPress={toggleShuffle}
            right={
              <View style={[styles.pill, shuffle && styles.pillActive]}>
                <Text style={[styles.pillText, shuffle && styles.pillTextActive]}>{shuffle ? 'On' : 'Off'}</Text>
              </View>
            }
          />
          <View style={styles.separator} />
          <Row
            icon="repeat"
            label="Repeat"
            description="Off → Repeat all → Repeat one"
            onPress={toggleRepeat}
            right={
              <View style={[styles.pill, repeatMode !== 'off' && styles.pillActive]}>
                <Text style={[styles.pillText, repeatMode !== 'off' && styles.pillTextActive]}>{repeatLabel}</Text>
              </View>
            }
          />
        </View>

        <Text style={styles.sectionLabel}>Storage</Text>
        <View style={styles.group}>
          <Row
            icon="server-outline"
            label="Music kept by AkMusic"
            description={
              Platform.OS === 'web'
                ? 'Files are referenced from your browser session'
                : 'Imported files are stored inside the app so they keep playing after restarts'
            }
            right={<Text style={styles.rowValue}>{Platform.OS === 'web' ? '—' : formatBytes(stats.bytes)}</Text>}
          />
          <View style={styles.separator} />
          <Row icon="trash-outline" label="Clear Library" description="Remove every song from AkMusic" destructive onPress={() => setConfirmClear(true)} disabled={!library.length} />
        </View>

        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.group}>
          <Row icon="musical-notes-outline" label="AkMusic" description="Version 1.0.0  ·  Local music, no streaming" right={null} />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmClear}
        title="Clear your library?"
        message={`This removes all ${library.length.toLocaleString()} songs from AkMusic. Your original files in the Files app stay untouched.`}
        confirmLabel="Clear Library"
        destructive
        icon="trash-outline"
        onCancel={() => setConfirmClear(false)}
        onConfirm={handleClear}
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPO.title,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.huge,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.large,
    paddingVertical: SPACING.lg,
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  statLabel: {
    ...TYPO.micro,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: SPACING.xs,
  },
  sectionLabel: {
    ...TYPO.micro,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  group: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.large,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
  },
  rowPressed: {
    backgroundColor: COLORS.elevated,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowDescription: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  rowValue: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: SPACING.lg + 36 + SPACING.md,
  },
  pill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.elevated,
  },
  pillActive: {
    backgroundColor: withAlpha(COLORS.accent, 0.2),
  },
  pillText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextActive: {
    color: COLORS.accent,
  },
  progressWrap: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  progressText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
});
