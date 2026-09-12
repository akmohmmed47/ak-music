import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { ART_COLORS } from '../theme';

export { formatDuration } from './timeUtils';

const MUSIC_DIR_NAME = 'music/';
const UNKNOWN_ARTIST = 'Unknown Artist';

/**
 * Types handed to expo-document-picker. On native iOS maps MIME -> UTType and
 * `audio/*` covers everything. On web we must NOT restrict: iOS Safari ignores
 * `accept="audio/*"` and greys out every audio file in the Files picker, so we
 * accept anything and filter with `isAudioAsset` after the pick instead.
 */
export const PICKER_TYPES =
  Platform.OS === 'web'
    ? ['*/*']
    : [
        'audio/*',
        'audio/mpeg',
        'audio/mp4',
        'audio/x-m4a',
        'audio/wav',
        'audio/flac',
        'audio/ogg',
        'public.audio',
        'public.mp3',
        'public.mpeg-4-audio',
      ];

/* ------------------------------------------------------------------ */
/* Hashing / colors                                                    */
/* ------------------------------------------------------------------ */

export function hashString(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Consistent accent color for a title (hash based). */
export function extractArtistColor(title) {
  return ART_COLORS[hashString(title) % ART_COLORS.length];
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }) {
  const to = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function shadeColor(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  if (amount < 0) {
    const f = 1 + amount;
    return rgbToHex({ r: r * f, g: g * f, b: b * f });
  }
  return rgbToHex({ r: r + (255 - r) * amount, g: g + (255 - g) * amount, b: b + (255 - b) * amount });
}

export function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Two-stop gradient derived from the title color. */
export function getGradientColors(title) {
  const base = extractArtistColor(title);
  return [shadeColor(base, 0.12), shadeColor(base, -0.45)];
}

/** Readable text color for a given background. */
export function getContrastText(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#1A1A1A' : '#FFFFFF';
}

export function getInitial(str) {
  const s = String(str || '').trim();
  const match = s.match(/[A-Za-z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u0900-\u097F]/);
  if (match) return match[0].toUpperCase();
  return s ? s[0].toUpperCase() : '♪';
}

/** Letter used for the A–Z index. */
export function getIndexLetter(str) {
  const s = String(str || '').trim().toUpperCase();
  const c = s[0];
  if (c && c >= 'A' && c <= 'Z') return c;
  return '#';
}

/* ------------------------------------------------------------------ */
/* Filename parsing                                                    */
/* ------------------------------------------------------------------ */

export function stripExtension(name) {
  return String(name || '').replace(/\.[^/.]+$/, '');
}

export function cleanName(str) {
  return String(str || '')
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeDecode(str) {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
}

function lastPathSegment(uri) {
  const clean = String(uri || '').split('?')[0];
  const seg = clean.substring(clean.lastIndexOf('/') + 1);
  return safeDecode(seg);
}

/** "Artist - Title.mp3" -> { artist: 'Artist', title: 'Title' } */
export function parseTitleArtist(filename) {
  const base = cleanName(stripExtension(filename));
  const idx = base.indexOf(' - ');
  let title = base;
  let artist = UNKNOWN_ARTIST;
  if (idx > 0) {
    artist = base.slice(0, idx).trim() || UNKNOWN_ARTIST;
    title = base.slice(idx + 3).trim() || base;
  }
  if (!title) title = 'Unknown Title';
  return { title, artist };
}

export function isAudioFile(name) {
  return /\.(mp3|m4a|m4b|aac|wav|flac|ogg|oga|opus|wma|aif|aiff|alac|mp4|caf|3gp|amr|mka)$/i.test(String(name || ''));
}

/** Picked asset looks like audio (by extension or reported MIME type). */
export function isAudioAsset(asset) {
  if (!asset || !asset.uri) return false;
  const mime = String(asset.mimeType || '').toLowerCase();
  if (mime.startsWith('audio/')) return true;
  return isAudioFile(asset.name || lastPathSegment(asset.uri));
}

/** Key used to detect duplicates across imports (Inbox uris change every pick). */
export function dedupeKey(fileOrSong) {
  const name = cleanName(stripExtension(fileOrSong.filename || fileOrSong.name || lastPathSegment(fileOrSong.uri))).toLowerCase();
  return `${name}|${fileOrSong.size || 0}`;
}

/**
 * Normalize a picked document into a song.
 * fileObject: { uri, name, mimeType, size }
 */
export function parseSongFromFile(file, index = 0) {
  const filename = file.name || lastPathSegment(file.uri) || `Track ${index + 1}`;
  const { title, artist } = parseTitleArtist(filename);
  const id = `${hashString(`${file.uri}|${filename}`).toString(36)}-${(file.size || 0).toString(36)}-${(Date.now() + index).toString(36)}`;
  return {
    id,
    title,
    artist,
    uri: file.uri,
    filename,
    mimeType: file.mimeType || null,
    size: file.size || 0,
    duration: 0,
    addedAt: Date.now() + index,
  };
}

export function isValidSong(song) {
  return !!(song && typeof song === 'object' && song.id && song.uri && song.title);
}

/** Re-derive title/artist from the stored filename (used by re-scan). */
export function renormalizeSong(song) {
  if (!song.filename) return song;
  const { title, artist } = parseTitleArtist(song.filename);
  if (title === song.title && artist === song.artist) return song;
  return { ...song, title, artist };
}

export function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/* ------------------------------------------------------------------ */
/* File persistence (native only)                                      */
/*                                                                     */
/* iOS's document picker always hands us a *temporary* copy of the     */
/* picked file (tmp/Inbox), which the system purges. We move it into    */
/* the app's own Documents/music folder so the library survives        */
/* restarts. Moving inside the sandbox is a rename – instant, no copy.  */
/* ------------------------------------------------------------------ */

export function getMusicDir() {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) return null;
  return FileSystem.documentDirectory + MUSIC_DIR_NAME;
}

export function isManagedUri(uri) {
  const dir = getMusicDir();
  return !!(dir && uri && uri.startsWith(dir));
}

let dirEnsured = false;
async function ensureMusicDir() {
  const dir = getMusicDir();
  if (!dir) return null;
  if (dirEnsured) return dir;
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    dirEnsured = true;
  } catch (e) {
    // ignore – we'll fall back to the original uri
  }
  return dir;
}

function sanitizeFilename(name) {
  return String(name || 'track')
    .replace(/[\/\\:*?"<>|\u0000-\u001F]/g, '_')
    .trim()
    .slice(0, 180);
}

/**
 * Move a picked file into persistent storage. Returns the new uri, or the
 * original uri if anything fails (web, Android content:// copy failures…).
 */
export async function persistPickedFile(asset) {
  if (Platform.OS === 'web') return asset.uri;
  const dir = await ensureMusicDir();
  if (!dir) return asset.uri;
  if (asset.uri && asset.uri.startsWith(dir)) return asset.uri;

  const original = sanitizeFilename(asset.name || lastPathSegment(asset.uri));
  const ext = original.includes('.') ? original.slice(original.lastIndexOf('.')) : '';
  const stem = ext ? original.slice(0, -ext.length) : original;

  let dest = dir + encodeURIComponent(original);
  try {
    const existing = await FileSystem.getInfoAsync(dest);
    if (existing.exists) {
      const suffix = hashString(`${asset.uri}|${asset.size || 0}|${Date.now()}`).toString(36).slice(0, 6);
      dest = dir + encodeURIComponent(`${stem}-${suffix}${ext}`);
    }
  } catch (e) {
    // ignore
  }

  try {
    await FileSystem.moveAsync({ from: asset.uri, to: dest });
    return dest;
  } catch (moveError) {
    try {
      await FileSystem.copyAsync({ from: asset.uri, to: dest });
      return dest;
    } catch (copyError) {
      return asset.uri;
    }
  }
}

/** Delete a file we manage. Never touches files outside our music folder. */
export async function removeManagedFile(uri) {
  if (!isManagedUri(uri)) return false;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    return true;
  } catch (e) {
    return false;
  }
}

/** Existence check – only meaningful for files inside our sandbox. */
export async function fileExists(uri) {
  if (Platform.OS === 'web') return true;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return !!info.exists;
  } catch (e) {
    return true;
  }
}

/** Size in bytes of everything inside our music folder. */
export async function getManagedStorageBytes(songs) {
  return (songs || []).filter((s) => isManagedUri(s.uri)).reduce((sum, s) => sum + (s.size || 0), 0);
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 MB';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
