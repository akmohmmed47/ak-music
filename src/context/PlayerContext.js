import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import {
  PICKER_TYPES,
  dedupeKey,
  fileExists,
  isAudioAsset,
  isManagedUri,
  isValidSong,
  parseSongFromFile,
  persistPickedFile,
  removeManagedFile,
  renormalizeSong,
  shuffleArray,
} from '../utils/fileUtils';

const KEYS = {
  library: '@akmusic/library',
  favorites: '@akmusic/favorites',
  shuffle: '@akmusic/shuffle',
  repeat: '@akmusic/repeat',
  volume: '@akmusic/volume',
};

const REPEAT_ORDER = ['off', 'all', 'one'];
const IMPORT_BATCH = 12;

const PlayerContext = createContext(null);
const ProgressContext = createContext({ position: 0, duration: 0, isBuffering: false });

function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw);
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

const yieldToUI = () => new Promise((resolve) => setTimeout(resolve, 0));

export function PlayerProvider({ children }) {
  /* ---------------------------- state ---------------------------- */
  const [library, setLibraryState] = useState([]);
  const [queue, setQueueState] = useState([]);
  const [currentIndex, setCurrentIndexState] = useState(0);
  const [currentSong, setCurrentSongState] = useState(null);
  const [isPlaying, setIsPlayingState] = useState(false);
  const [shuffle, setShuffleState] = useState(false);
  const [repeatMode, setRepeatModeState] = useState('off');
  const [position, setPositionState] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [volume, setVolumeState] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [toast, setToast] = useState(null);

  /* ----------------------------- refs ---------------------------- */
  const playerRef = useRef(null);
  const libraryRef = useRef([]);
  const queueRef = useRef([]);
  const baseQueueRef = useRef([]);
  const indexRef = useRef(0);
  const currentSongRef = useRef(null);
  const isPlayingRef = useRef(false);
  const shuffleRef = useRef(false);
  const repeatRef = useRef('off');
  const volumeRef = useRef(1);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const lastCommandAtRef = useRef(0);
  const seekingUntilRef = useRef(0);
  const finishHandledRef = useRef(false);
  const errorHandledRef = useRef(false);
  const failStreakRef = useRef(0);
  const interruptedRef = useRef(false);
  const backgroundedAtRef = useRef(0);
  const loadTokenRef = useRef(0);
  const webEndedCleanupRef = useRef(null);
  const toastTimerRef = useRef(null);
  const statusHandlerRef = useRef(null);
  const appStateHandlerRef = useRef(null);

  /* ------------------------ ref+state setters ----------------------- */
  const setLibrary = useCallback((updater) => {
    setLibraryState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      libraryRef.current = next;
      return next;
    });
  }, []);

  const setQueue = useCallback((q) => {
    queueRef.current = q;
    setQueueState(q);
  }, []);

  const setIndex = useCallback((i) => {
    indexRef.current = i;
    setCurrentIndexState(i);
  }, []);

  const setCurrentSong = useCallback((s) => {
    currentSongRef.current = s;
    setCurrentSongState(s);
  }, []);

  const setPlaying = useCallback((v) => {
    isPlayingRef.current = v;
    setIsPlayingState(v);
  }, []);

  const setPosition = useCallback((ms) => {
    positionRef.current = ms;
    setPositionState(ms);
  }, []);

  /* ----------------------------- toast --------------------------- */
  const showToast = useCallback((message, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const hideToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  /* ------------------------- load persisted ------------------------ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet(Object.values(KEYS));
        const map = Object.fromEntries(entries);
        const lib = safeParse(map[KEYS.library], []);
        const favs = safeParse(map[KEYS.favorites], []);
        const shuf = safeParse(map[KEYS.shuffle], false);
        const rep = safeParse(map[KEYS.repeat], 'off');
        const vol = safeParse(map[KEYS.volume], 1);
        if (cancelled) return;
        const cleanLib = Array.isArray(lib) ? lib.filter(isValidSong) : [];
        libraryRef.current = cleanLib;
        setLibraryState(cleanLib);
        setFavorites(Array.isArray(favs) ? favs : []);
        shuffleRef.current = !!shuf;
        setShuffleState(!!shuf);
        const repeatValue = REPEAT_ORDER.includes(rep) ? rep : 'off';
        repeatRef.current = repeatValue;
        setRepeatModeState(repeatValue);
        const v = typeof vol === 'number' && vol >= 0 && vol <= 1 ? vol : 1;
        volumeRef.current = v;
        setVolumeState(v);
      } catch (e) {
        // corrupted storage – start fresh
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* --------------------------- persistence -------------------------- */
  useEffect(() => {
    if (!isReady) return undefined;
    const t = setTimeout(() => {
      AsyncStorage.setItem(KEYS.library, JSON.stringify(library)).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [library, isReady]);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(KEYS.favorites, JSON.stringify(favorites)).catch(() => {});
  }, [favorites, isReady]);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(KEYS.shuffle, JSON.stringify(shuffle)).catch(() => {});
  }, [shuffle, isReady]);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(KEYS.repeat, JSON.stringify(repeatMode)).catch(() => {});
  }, [repeatMode, isReady]);

  useEffect(() => {
    if (!isReady) return undefined;
    const t = setTimeout(() => {
      AsyncStorage.setItem(KEYS.volume, JSON.stringify(volume)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [volume, isReady]);

  /* --------------------------- audio engine -------------------------- */
  const setLockScreen = useCallback((player, song) => {
    if (!player || !song) return;
    try {
      player.setActiveForLockScreen(true, {
        title: song.title,
        artist: song.artist,
        albumTitle: 'AkMusic',
      });
    } catch (e) {
      // lock screen controls unsupported on this platform – ignore
    }
  }, []);

  const attachWebEnded = useCallback((player) => {
    if (Platform.OS !== 'web') return;
    if (webEndedCleanupRef.current) {
      webEndedCleanupRef.current();
      webEndedCleanupRef.current = null;
    }
    const media = player && player.media;
    if (!media || typeof media.addEventListener !== 'function') return;
    const onEnded = () => {
      const handler = statusHandlerRef.current;
      if (handler) {
        handler({
          isLoaded: true,
          playing: false,
          didJustFinish: true,
          currentTime: media.duration || 0,
          duration: media.duration || 0,
          timeControlStatus: 'paused',
          isBuffering: false,
          error: null,
        });
      }
    };
    media.addEventListener('ended', onEnded);
    webEndedCleanupRef.current = () => media.removeEventListener('ended', onEnded);
  }, []);

  const stopPlayback = useCallback(() => {
    const player = playerRef.current;
    lastCommandAtRef.current = Date.now();
    try {
      if (player) {
        player.pause();
        player.seekTo(0).catch(() => {});
      }
    } catch (e) {
      // ignore
    }
    setPlaying(false);
    setPosition(0);
  }, [setPlaying, setPosition]);

  const loadAndPlay = useCallback(
    (song, autoplay = true) => {
      const player = playerRef.current;
      if (!song) return;
      loadTokenRef.current += 1;
      finishHandledRef.current = false;
      errorHandledRef.current = false;
      lastCommandAtRef.current = Date.now();
      seekingUntilRef.current = 0;
      setCurrentSong(song);
      setPosition(0);
      durationRef.current = song.duration || 0;
      setDuration(song.duration || 0);
      if (!player) {
        showToast('Audio engine unavailable', 'error');
        return;
      }
      try {
        player.replace({ uri: song.uri, name: song.title });
        attachWebEnded(player);
        try {
          player.volume = volumeRef.current;
        } catch (e) {
          // volume unsupported (iOS Safari) – ignore
        }
        if (autoplay) {
          player.play();
          setPlaying(true);
        } else {
          setPlaying(false);
        }
        setLockScreen(player, song);
      } catch (e) {
        errorHandledRef.current = true;
        showToast(`Couldn't play ${song.title}`, 'error');
        setPlaying(false);
      }
    },
    [attachWebEnded, setCurrentSong, setLockScreen, setPlaying, setPosition, showToast]
  );

  /** Move to the next song. `auto` = triggered by track finishing. */
  const advance = useCallback(
    (auto) => {
      const q = queueRef.current;
      if (!q.length) return;
      let idx = indexRef.current;
      if (idx + 1 < q.length) {
        idx += 1;
      } else if (repeatRef.current === 'all' || !auto) {
        idx = 0;
        if (shuffleRef.current && q.length > 2) {
          // fresh order for the next lap
          const reshuffled = shuffleArray(q);
          setQueue(reshuffled);
          setIndex(0);
          loadAndPlay(reshuffled[0]);
          return;
        }
      } else {
        // end of queue, repeat off -> stop on the last song
        stopPlayback();
        return;
      }
      setIndex(idx);
      loadAndPlay(q[idx]);
    },
    [loadAndPlay, setIndex, setQueue, stopPlayback]
  );

  const handleTrackFinished = useCallback(() => {
    failStreakRef.current = 0;
    const player = playerRef.current;
    if (repeatRef.current === 'one' && player) {
      lastCommandAtRef.current = Date.now();
      player.seekTo(0).catch(() => {});
      player.play();
      setPlaying(true);
      setPosition(0);
      setTimeout(() => {
        finishHandledRef.current = false;
      }, 800);
      return;
    }
    advance(true);
  }, [advance, setPlaying, setPosition]);

  const handlePlaybackError = useCallback(() => {
    if (errorHandledRef.current) return;
    errorHandledRef.current = true;
    const song = currentSongRef.current;
    failStreakRef.current += 1;
    showToast(`Couldn't play ${song ? song.title : 'this song'}`, 'error');
    const limit = Math.max(1, Math.min(queueRef.current.length, 5));
    if (failStreakRef.current >= limit || queueRef.current.length <= 1) {
      stopPlayback();
      return;
    }
    setTimeout(() => advance(true), 250);
  }, [advance, showToast, stopPlayback]);

  const recordDuration = useCallback(
    (durMs) => {
      const song = currentSongRef.current;
      if (!song || durMs <= 0) return;
      if (Math.abs((song.duration || 0) - durMs) < 1500) return;
      const updated = { ...song, duration: durMs };
      currentSongRef.current = updated;
      setCurrentSongState(updated);
      setLibrary((prev) => prev.map((s) => (s.id === song.id ? { ...s, duration: durMs } : s)));
      const q = queueRef.current;
      if (q.some((s) => s.id === song.id)) {
        setQueue(q.map((s) => (s.id === song.id ? { ...s, duration: durMs } : s)));
      }
    },
    [setLibrary, setQueue]
  );

  const handleStatus = useCallback(
    (status) => {
      if (!status) return;
      const now = Date.now();
      const durMs = Math.round((status.duration || 0) * 1000);
      const posMs = Math.round((status.currentTime || 0) * 1000);

      if (status.error || status.playbackState === 'failed' || status.playbackState === 'error') {
        handlePlaybackError();
        return;
      }

      if (durMs > 0 && isFinite(durMs) && Math.abs(durationRef.current - durMs) > 200) {
        durationRef.current = durMs;
        setDuration(durMs);
        recordDuration(durMs);
      }

      if (now > seekingUntilRef.current && isFinite(posMs)) {
        setPosition(posMs);
      }
      setIsBuffering(!!status.isBuffering);

      if (status.didJustFinish && !finishHandledRef.current) {
        finishHandledRef.current = true;
        handleTrackFinished();
        return;
      }

      if (status.playing && !isPlayingRef.current && now - lastCommandAtRef.current > 1000) {
        // resumed from lock screen / headphones
        setPlaying(true);
        interruptedRef.current = false;
      } else if (
        !status.playing &&
        isPlayingRef.current &&
        status.isLoaded &&
        !status.isBuffering &&
        status.timeControlStatus !== 'waitingToPlayAtSpecifiedRate' &&
        now - lastCommandAtRef.current > 1500
      ) {
        // paused by something other than us: phone call, lock screen, unplugged headphones
        setPlaying(false);
        const appActive = AppState.currentState === 'active';
        if (!appActive && now - backgroundedAtRef.current < 4000) {
          interruptedRef.current = true;
        }
      }
    },
    [handlePlaybackError, handleTrackFinished, recordDuration, setPlaying, setPosition]
  );
  statusHandlerRef.current = handleStatus;

  const handleAppState = useCallback(
    (state) => {
      const player = playerRef.current;
      if (state === 'active') {
        if (interruptedRef.current && currentSongRef.current && player) {
          interruptedRef.current = false;
          lastCommandAtRef.current = Date.now();
          try {
            player.play();
            setPlaying(true);
          } catch (e) {
            // ignore
          }
        }
      } else {
        backgroundedAtRef.current = Date.now();
      }
    },
    [setPlaying]
  );
  appStateHandlerRef.current = handleAppState;

  useEffect(() => {
    let player = null;
    try {
      player = createAudioPlayer(null, { updateInterval: 500 });
      playerRef.current = player;
    } catch (e) {
      playerRef.current = null;
    }
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});

    const sub = player ? player.addListener('playbackStatusUpdate', (s) => statusHandlerRef.current && statusHandlerRef.current(s)) : null;
    const appSub = AppState.addEventListener('change', (s) => appStateHandlerRef.current && appStateHandlerRef.current(s));

    return () => {
      if (sub) sub.remove();
      appSub.remove();
      if (webEndedCleanupRef.current) webEndedCleanupRef.current();
      try {
        if (player) {
          player.pause();
          player.remove();
        }
      } catch (e) {
        // ignore
      }
      playerRef.current = null;
    };
  }, []);

  /* ------------------------------ actions ------------------------------ */
  const playSong = useCallback(
    (song, list) => {
      if (!song) return;
      const base = Array.isArray(list) && list.length ? list : [song];
      baseQueueRef.current = base;
      let q;
      let idx;
      if (shuffleRef.current) {
        q = [song, ...shuffleArray(base.filter((s) => s.id !== song.id))];
        idx = 0;
      } else {
        idx = base.findIndex((s) => s.id === song.id);
        if (idx < 0) {
          q = [song, ...base];
          idx = 0;
        } else {
          q = base;
        }
      }
      failStreakRef.current = 0;
      setQueue(q);
      setIndex(idx);
      loadAndPlay(song);
    },
    [loadAndPlay, setIndex, setQueue]
  );

  const pauseResume = useCallback(() => {
    const player = playerRef.current;
    const song = currentSongRef.current;
    if (!song) return;
    if (!player) return;
    lastCommandAtRef.current = Date.now();
    interruptedRef.current = false;
    try {
      if (isPlayingRef.current) {
        player.pause();
        setPlaying(false);
      } else {
        const dur = durationRef.current;
        if (dur > 0 && positionRef.current >= dur - 400) {
          player.seekTo(0).catch(() => {});
          setPosition(0);
        }
        finishHandledRef.current = false;
        player.play();
        setPlaying(true);
      }
    } catch (e) {
      showToast(`Couldn't play ${song.title}`, 'error');
    }
  }, [setPlaying, setPosition, showToast]);

  const playNext = useCallback(() => {
    if (!queueRef.current.length) return;
    failStreakRef.current = 0;
    advance(false);
  }, [advance]);

  const playPrev = useCallback(() => {
    const player = playerRef.current;
    const q = queueRef.current;
    if (!q.length || !player) return;
    lastCommandAtRef.current = Date.now();
    const restart = () => {
      seekingUntilRef.current = Date.now() + 600;
      setPosition(0);
      player.seekTo(0).catch(() => {});
      if (!isPlayingRef.current) {
        player.play();
        setPlaying(true);
      }
    };
    if (positionRef.current > 3000 || q.length === 1) {
      restart();
      return;
    }
    let idx = indexRef.current - 1;
    if (idx < 0) {
      if (repeatRef.current === 'all') idx = q.length - 1;
      else {
        restart();
        return;
      }
    }
    setIndex(idx);
    loadAndPlay(q[idx]);
  }, [loadAndPlay, setIndex, setPlaying, setPosition]);

  const seekTo = useCallback(
    (millis) => {
      const player = playerRef.current;
      if (!player || !currentSongRef.current) return;
      const dur = durationRef.current;
      const clamped = Math.max(0, dur > 0 ? Math.min(millis, dur) : millis);
      seekingUntilRef.current = Date.now() + 700;
      setPosition(clamped);
      finishHandledRef.current = false;
      player.seekTo(clamped / 1000).catch(() => {});
    },
    [setPosition]
  );

  const toggleShuffle = useCallback(() => {
    const next = !shuffleRef.current;
    shuffleRef.current = next;
    setShuffleState(next);
    const cur = currentSongRef.current;
    const base = baseQueueRef.current.length ? baseQueueRef.current : queueRef.current;
    if (!base.length) return;
    if (next) {
      const rest = base.filter((s) => !cur || s.id !== cur.id);
      const q = cur ? [cur, ...shuffleArray(rest)] : shuffleArray(rest);
      setQueue(q);
      setIndex(0);
    } else {
      const idx = cur ? base.findIndex((s) => s.id === cur.id) : 0;
      setQueue(base);
      setIndex(Math.max(0, idx));
    }
  }, [setIndex, setQueue]);

  const toggleRepeat = useCallback(() => {
    const i = REPEAT_ORDER.indexOf(repeatRef.current);
    const next = REPEAT_ORDER[(i + 1) % REPEAT_ORDER.length];
    repeatRef.current = next;
    setRepeatModeState(next);
  }, []);

  const toggleFavorite = useCallback((id) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  }, []);

  const setVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v));
    volumeRef.current = clamped;
    setVolumeState(clamped);
    const player = playerRef.current;
    if (player) {
      try {
        player.volume = clamped;
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const addToQueue = useCallback(
    (song) => {
      if (!song) return;
      if (!currentSongRef.current) {
        playSong(song, [song]);
        showToast(`Playing ${song.title}`);
        return;
      }
      setQueue([...queueRef.current, song]);
      baseQueueRef.current = [...baseQueueRef.current, song];
      showToast('Added to queue');
    },
    [playSong, setQueue, showToast]
  );

  const playNext_queue = useCallback(
    (song) => {
      if (!song) return;
      if (!currentSongRef.current) {
        playSong(song, [song]);
        showToast(`Playing ${song.title}`);
        return;
      }
      const q = queueRef.current.slice();
      q.splice(indexRef.current + 1, 0, song);
      setQueue(q);
      const base = baseQueueRef.current.slice();
      const cur = currentSongRef.current;
      const bi = base.findIndex((s) => s.id === cur.id);
      base.splice(bi >= 0 ? bi + 1 : base.length, 0, song);
      baseQueueRef.current = base;
      showToast('Will play next');
    },
    [playSong, setQueue, showToast]
  );

  const removeFromQueue = useCallback(
    (queueIndex) => {
      const q = queueRef.current;
      if (queueIndex < 0 || queueIndex >= q.length || queueIndex === indexRef.current) return;
      const removed = q[queueIndex];
      const next = q.filter((_, i) => i !== queueIndex);
      setQueue(next);
      if (queueIndex < indexRef.current) setIndex(indexRef.current - 1);
      const bi = baseQueueRef.current.findIndex((s) => s.id === removed.id);
      if (bi >= 0) baseQueueRef.current = baseQueueRef.current.filter((_, i) => i !== bi);
    },
    [setIndex, setQueue]
  );

  const clearUpcoming = useCallback(() => {
    const q = queueRef.current;
    const cur = q[indexRef.current];
    const next = cur ? [cur] : [];
    setQueue(next);
    setIndex(0);
    baseQueueRef.current = next;
    showToast('Queue cleared');
  }, [setIndex, setQueue, showToast]);

  const jumpToQueueIndex = useCallback(
    (queueIndex) => {
      const q = queueRef.current;
      if (queueIndex < 0 || queueIndex >= q.length) return;
      setIndex(queueIndex);
      loadAndPlay(q[queueIndex]);
    },
    [loadAndPlay, setIndex]
  );

  /* ------------------------------ library ------------------------------ */
  const importSongs = useCallback(
    async (pickedFiles, onProgress) => {
      const files = Array.isArray(pickedFiles) ? pickedFiles : [];
      const existingKeys = new Set(libraryRef.current.map(dedupeKey));
      const added = [];
      let skipped = 0;
      for (let i = 0; i < files.length; i += IMPORT_BATCH) {
        const batch = files.slice(i, i + IMPORT_BATCH);
        const results = await Promise.all(
          batch.map(async (file, j) => {
            if (!file || !file.uri) return null;
            const key = dedupeKey(file);
            if (existingKeys.has(key)) {
              skipped += 1;
              return null;
            }
            existingKeys.add(key);
            const uri = await persistPickedFile(file);
            return parseSongFromFile({ ...file, uri }, i + j);
          })
        );
        results.forEach((s) => s && added.push(s));
        if (onProgress) onProgress(Math.min(i + IMPORT_BATCH, files.length), files.length);
        await yieldToUI();
      }
      if (added.length) {
        setLibrary((prev) => [...prev, ...added]);
      }
      return { added: added.length, skipped };
    },
    [setLibrary]
  );

  const pickAndImport = useCallback(
    async (onProgress) => {
      let result;
      try {
        result = await DocumentPicker.getDocumentAsync({
          multiple: true,
          type: PICKER_TYPES,
          copyToCacheDirectory: false,
          base64: false,
        });
      } catch (e) {
        showToast("Couldn't open the file picker", 'error');
        return { canceled: true, added: 0, skipped: 0, total: 0 };
      }
      if (!result || result.canceled || !result.assets || !result.assets.length) {
        return { canceled: true, added: 0, skipped: 0, total: 0 };
      }
      // Web picker is unrestricted (see PICKER_TYPES) – keep only audio files.
      const audioAssets = result.assets.filter(isAudioAsset);
      const total = audioAssets.length;
      if (!total) {
        return { canceled: false, added: 0, skipped: 0, total: 0 };
      }
      if (onProgress) onProgress(0, total);
      const { added, skipped } = await importSongs(audioAssets, onProgress);
      return { canceled: false, added, skipped, total };
    },
    [importSongs, showToast]
  );

  const deleteFromLibrary = useCallback(
    async (id) => {
      const song = libraryRef.current.find((s) => s.id === id);
      if (!song) return;
      const wasCurrent = currentSongRef.current && currentSongRef.current.id === id;
      const q = queueRef.current;
      const qi = q.findIndex((s) => s.id === id);

      setLibrary((prev) => prev.filter((s) => s.id !== id));
      setFavorites((prev) => prev.filter((f) => f !== id));
      baseQueueRef.current = baseQueueRef.current.filter((s) => s.id !== id);

      if (qi >= 0) {
        const nextQueue = q.filter((s) => s.id !== id);
        if (wasCurrent) {
          if (nextQueue.length) {
            const nextIdx = Math.min(qi, nextQueue.length - 1);
            setQueue(nextQueue);
            setIndex(nextIdx);
            loadAndPlay(nextQueue[nextIdx], isPlayingRef.current);
          } else {
            stopPlayback();
            setQueue([]);
            setIndex(0);
            setCurrentSong(null);
            setDuration(0);
            try {
              if (playerRef.current) playerRef.current.setActiveForLockScreen(false);
            } catch (e) {
              // ignore
            }
          }
        } else {
          setQueue(nextQueue);
          if (qi < indexRef.current) setIndex(indexRef.current - 1);
        }
      }
      removeManagedFile(song.uri);
      showToast(`Removed "${song.title}"`);
    },
    [loadAndPlay, setCurrentSong, setIndex, setLibrary, setQueue, showToast, stopPlayback]
  );

  const clearLibrary = useCallback(async () => {
    const songs = libraryRef.current;
    stopPlayback();
    setQueue([]);
    setIndex(0);
    setCurrentSong(null);
    setDuration(0);
    baseQueueRef.current = [];
    setFavorites([]);
    setLibrary([]);
    try {
      if (playerRef.current) playerRef.current.setActiveForLockScreen(false);
    } catch (e) {
      // ignore
    }
    for (let i = 0; i < songs.length; i += 25) {
      await Promise.all(songs.slice(i, i + 25).map((s) => removeManagedFile(s.uri)));
    }
    showToast('Library cleared');
  }, [setCurrentSong, setIndex, setLibrary, setQueue, showToast, stopPlayback]);

  const rescanLibrary = useCallback(async () => {
    const songs = libraryRef.current;
    let removed = 0;
    const normalized = songs.map(renormalizeSong);
    if (Platform.OS === 'web') {
      setLibrary(normalized);
      return { removed: 0, total: normalized.length };
    }
    const checks = [];
    for (let i = 0; i < normalized.length; i += 40) {
      const batch = normalized.slice(i, i + 40);
      const res = await Promise.all(
        batch.map(async (s) => {
          if (!isManagedUri(s.uri)) return { song: s, ok: true };
          const ok = await fileExists(s.uri);
          return { song: s, ok };
        })
      );
      checks.push(...res);
      await yieldToUI();
    }
    const kept = checks.filter((c) => c.ok).map((c) => c.song);
    removed = normalized.length - kept.length;
    const removedIds = new Set(checks.filter((c) => !c.ok).map((c) => c.song.id));
    setLibrary(kept);
    if (removedIds.size) {
      setFavorites((prev) => prev.filter((f) => !removedIds.has(f)));
      const q = queueRef.current.filter((s) => !removedIds.has(s.id));
      if (q.length !== queueRef.current.length) {
        setQueue(q);
        baseQueueRef.current = baseQueueRef.current.filter((s) => !removedIds.has(s.id));
        const cur = currentSongRef.current;
        if (cur && removedIds.has(cur.id)) {
          stopPlayback();
          setCurrentSong(null);
          setIndex(0);
        } else if (cur) {
          setIndex(Math.max(0, q.findIndex((s) => s.id === cur.id)));
        }
      }
    }
    return { removed, total: kept.length };
  }, [setCurrentSong, setIndex, setLibrary, setQueue, stopPlayback]);

  const shareSong = useCallback(
    async (song) => {
      if (!song) return;
      try {
        if (Platform.OS === 'web') {
          if (typeof navigator !== 'undefined' && navigator.share) {
            await navigator.share({ title: song.title, text: `${song.title} — ${song.artist}` });
          } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(`${song.title} — ${song.artist}`);
            showToast('Copied song info to clipboard');
          } else {
            showToast('Sharing not supported here');
          }
          return;
        }
        await Share.share(
          Platform.OS === 'ios'
            ? { url: song.uri, message: `${song.title} — ${song.artist}` }
            : { message: `${song.title} — ${song.artist}\n${song.uri}`, title: song.title }
        );
      } catch (e) {
        // user dismissed – nothing to do
      }
    },
    [showToast]
  );

  /* ------------------------------ derived ------------------------------ */
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const isFavorite = useCallback((id) => favoriteSet.has(id), [favoriteSet]);

  const value = useMemo(
    () => ({
      library,
      queue,
      currentIndex,
      currentSong,
      isPlaying,
      shuffle,
      repeatMode,
      favorites,
      favoriteSet,
      volume,
      isReady,
      toast,
      showToast,
      hideToast,
      playSong,
      pauseResume,
      playNext,
      playPrev,
      seekTo,
      toggleShuffle,
      toggleRepeat,
      toggleFavorite,
      isFavorite,
      setVolume,
      addToQueue,
      playNext_queue,
      removeFromQueue,
      clearUpcoming,
      jumpToQueueIndex,
      importSongs,
      pickAndImport,
      deleteFromLibrary,
      clearLibrary,
      rescanLibrary,
      shareSong,
    }),
    [
      library,
      queue,
      currentIndex,
      currentSong,
      isPlaying,
      shuffle,
      repeatMode,
      favorites,
      favoriteSet,
      volume,
      isReady,
      toast,
      showToast,
      hideToast,
      playSong,
      pauseResume,
      playNext,
      playPrev,
      seekTo,
      toggleShuffle,
      toggleRepeat,
      toggleFavorite,
      isFavorite,
      setVolume,
      addToQueue,
      playNext_queue,
      removeFromQueue,
      clearUpcoming,
      jumpToQueueIndex,
      importSongs,
      pickAndImport,
      deleteFromLibrary,
      clearLibrary,
      rescanLibrary,
      shareSong,
    ]
  );

  const progressValue = useMemo(() => ({ position, duration, isBuffering }), [position, duration, isBuffering]);

  return (
    <PlayerContext.Provider value={value}>
      <ProgressContext.Provider value={progressValue}>{children}</ProgressContext.Provider>
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return ctx;
}

/** Position / duration only – updates every 500ms, keep consumers small. */
export function usePlayerProgress() {
  return useContext(ProgressContext);
}
