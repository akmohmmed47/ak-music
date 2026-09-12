export const COLORS = {
  bg: '#0A0A0A',
  surface: '#181818',
  elevated: '#282828',
  accent: '#A259FF',
  accentSoft: '#7B2FBE',
  text: '#FFFFFF',
  textMuted: '#A7A7A7',
  textDim: '#535353',
  danger: '#E64747',
  border: '#282828',
  overlay: 'rgba(0,0,0,0.6)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const RADIUS = {
  small: 8,
  medium: 12,
  large: 20,
  pill: 100,
};

export const TYPO = {
  titleLarge: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  title: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  body: { fontSize: 15, fontWeight: '400', color: COLORS.text },
  caption: { fontSize: 12, fontWeight: '400', color: COLORS.textMuted },
  micro: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
};

export const ART_COLORS = [
  '#A259FF',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
];

export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 12,
  },
};
