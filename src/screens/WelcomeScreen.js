import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { COLORS, RADIUS, SHADOW, SPACING } from '../theme';
import { withAlpha } from '../utils/fileUtils';
import { usePlayer } from '../context/PlayerContext';
import Equalizer from '../components/Equalizer';

export default function WelcomeScreen() {
  const { pickAndImport, showToast } = usePlayer();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const glow = useSharedValue(0.6);
  const heroScale = useSharedValue(0.8);
  const contentY = useSharedValue(30);
  const contentOpacity = useSharedValue(0);
  const barWidth = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), withTiming(0.6, { duration: 2200, easing: Easing.inOut(Easing.sin) })),
      -1,
      true
    );
    heroScale.value = withSpring(1, { damping: 12, stiffness: 120 });
    contentY.value = withSpring(0, { damping: 16, stiffness: 120 });
    contentOpacity.value = withTiming(1, { duration: 500 });
  }, [glow, heroScale, contentY, contentOpacity]);

  useEffect(() => {
    const ratio = progress.total > 0 ? progress.done / progress.total : 0;
    barWidth.value = withTiming(ratio, { duration: 200 });
  }, [progress, barWidth]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.9 + glow.value * 0.2 }] }));
  const heroStyle = useAnimatedStyle(() => ({ transform: [{ scale: heroScale.value }] }));
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateY: contentY.value }], opacity: contentOpacity.value }));
  const barStyle = useAnimatedStyle(() => ({ width: `${Math.round(barWidth.value * 100)}%` }));

  const handleImport = async () => {
    if (importing) return;
    setImporting(true);
    setProgress({ done: 0, total: 0 });
    try {
      const res = await pickAndImport((done, total) => setProgress({ done, total }));
      if (res.canceled) return;
      if (res.added === 0) {
        showToast(res.skipped > 0 ? 'Those songs are already in your library' : 'No audio files were found', 'error');
      } else {
        showToast(`Added ${res.added.toLocaleString()} song${res.added === 1 ? '' : 's'}`);
      }
    } catch (e) {
      showToast('Import failed. Please try again.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const scanningLabel =
    progress.total > 0 ? `Scanning ${progress.done.toLocaleString()} of ${progress.total.toLocaleString()} songs…` : 'Preparing your music…';

  return (
    <LinearGradient colors={['#0A0A0A', '#120A1E', '#1A0A2E']} locations={[0, 0.55, 1]} style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.heroWrap}>
          <Animated.View style={[styles.glow, glowStyle]} />
          <Animated.View style={[styles.hero, heroStyle]}>
            <LinearGradient colors={[COLORS.accent, COLORS.accentSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroInner}>
              <View style={styles.heroBars}>
                <Equalizer playing color="#FFFFFF" size="large" />
              </View>
              <Ionicons name="musical-notes" size={64} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>
        </View>

        <Animated.View style={[styles.content, contentStyle]}>
          <Text style={styles.title}>AkMusic</Text>
          <Text style={styles.subtitle}>Your music. Your way.</Text>
          <Text style={styles.description}>
            Play the songs already on your {Platform.OS === 'ios' ? 'iPhone' : 'device'}. Pick them once from the Files app and they live here — no
            streaming, no account.
          </Text>

          {importing ? (
            <View style={styles.progressCard}>
              <View style={styles.progressRow}>
                <ActivityIndicator color={COLORS.accent} />
                <Text style={styles.progressText}>{scanningLabel}</Text>
              </View>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, barStyle]} />
              </View>
            </View>
          ) : (
            <>
              <Pressable onPress={handleImport} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
                <Ionicons name="folder-open" size={20} color={COLORS.text} />
                <Text style={styles.buttonText}>Import Music</Text>
              </Pressable>
              <View style={styles.hintRow}>
                <Ionicons name="information-circle-outline" size={14} color={COLORS.textDim} />
                <Text style={styles.hint}>
                  {Platform.OS === 'ios'
                    ? 'Files → On My iPhone → VLC.  Tap Select to grab everything at once.'
                    : Platform.OS === 'web'
                      ? 'Choose File → Browse → On My iPhone → VLC. Tap Select to pick many. Non-audio files are ignored.'
                      : 'Select as many audio files as you like.'}
                </Text>
              </View>
            </>
          )}
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: SPACING.xxxl,
    justifyContent: 'center',
  },
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 260,
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: withAlpha(COLORS.accent, 0.25),
  },
  hero: {
    width: 168,
    height: 168,
    borderRadius: 42,
    ...SHADOW.glow,
  },
  heroInner: {
    flex: 1,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBars: {
    position: 'absolute',
    bottom: 22,
    right: 22,
    transform: [{ scale: 1.4 }],
    opacity: 0.9,
  },
  content: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  description: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxxl,
    maxWidth: 320,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    paddingHorizontal: SPACING.xxxl,
    borderRadius: RADIUS.pill,
    minWidth: 220,
    justifyContent: 'center',
    ...SHADOW.glow,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.lg,
    maxWidth: 320,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textDim,
    textAlign: 'center',
    flexShrink: 1,
  },
  progressCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: withAlpha('#FFFFFF', 0.05),
    borderRadius: RADIUS.medium,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  progressText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: withAlpha('#FFFFFF', 0.1),
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
});
