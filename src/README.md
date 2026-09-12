# AkMusic — source layout

```
App.js                      navigation (stack + tabs), custom tab bar with MiniPlayer
src/
  theme.js                  colors / spacing / radius / typography tokens
  context/PlayerContext.js  global player state + expo-audio engine + import/persist
  screens/                  Welcome, Library, Search, Artists, ArtistDetail, NowPlaying, Settings
  components/               MiniPlayer, SongItem, PlayerControls, SeekBar, EmptyState,
                            Equalizer, Marquee, AlphabetIndex, QueueSheet, SongOptionsSheet,
                            ConfirmDialog, Toast
  utils/fileUtils.js        filename parsing, colors, file persistence (expo-file-system)
  utils/timeUtils.js        duration formatting
```
