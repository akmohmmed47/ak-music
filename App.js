import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { COLORS } from './src/theme';
import { PlayerProvider, usePlayer } from './src/context/PlayerContext';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import SearchScreen from './src/screens/SearchScreen';
import ArtistsScreen from './src/screens/ArtistsScreen';
import ArtistDetailScreen from './src/screens/ArtistDetailScreen';
import NowPlayingScreen from './src/screens/NowPlayingScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MiniPlayer from './src/components/MiniPlayer';
import Toast from './src/components/Toast';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.accent,
    background: COLORS.bg,
    card: COLORS.bg,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.accent,
  },
};

const TAB_ICONS = {
  Library: { active: 'grid', inactive: 'grid-outline' },
  Search: { active: 'search', inactive: 'search-outline' },
  Artists: { active: 'person', inactive: 'person-outline' },
};

function TabIcon({ name, focused }) {
  const scale = useSharedValue(1);
  const dot = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.12 : 1, { damping: 12, stiffness: 260 });
    dot.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focused, scale, dot]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value, transform: [{ scale: dot.value }] }));
  const icons = TAB_ICONS[name];

  return (
    <View style={styles.tabIconWrap}>
      <Animated.View style={iconStyle}>
        <Ionicons name={focused ? icons.active : icons.inactive} size={24} color={focused ? COLORS.accent : COLORS.textDim} />
      </Animated.View>
      <Animated.View style={[styles.tabDot, dotStyle]} />
    </View>
  );
}

/** Custom tab bar so the MiniPlayer sits persistently above the tabs. */
function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { currentSong } = usePlayer();

  return (
    <View style={styles.tabBarWrap}>
      {currentSong ? <MiniPlayer /> : null}
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 8 : 0) }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || route.name}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
            >
              <TabIcon name={route.name} focused={focused} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: COLORS.bg },
        lazy: true,
      }}
    >
      <Tab.Screen name="Library" component={LibraryScreen} options={{ tabBarAccessibilityLabel: 'Library' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ tabBarAccessibilityLabel: 'Search' }} />
      <Tab.Screen name="Artists" component={ArtistsScreen} options={{ tabBarAccessibilityLabel: 'Artists' }} />
    </Tab.Navigator>
  );
}

function SplashView() {
  return (
    <View style={styles.splash}>
      <Text style={styles.splashText}>AkMusic</Text>
    </View>
  );
}

function RootNavigator() {
  const { library, isReady } = usePlayer();

  if (!isReady) return <SplashView />;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.bg },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      {library.length === 0 ? (
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade' }} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ animation: 'fade' }} />
          <Stack.Screen name="ArtistDetail" component={ArtistDetailScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen
            name="NowPlaying"
            component={NowPlayingScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              gestureEnabled: true,
              gestureDirection: 'vertical',
              gestureResponseDistance: 800,
              cardOverlayEnabled: true,
              cardStyle: { backgroundColor: COLORS.bg },
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  if (!fontsLoaded) {
    return <SplashView />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PlayerProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
          <Toast />
        </PlayerProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  splash: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    color: COLORS.accent,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tabBarWrap: {
    backgroundColor: COLORS.bg,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.elevated,
    height: undefined,
  },
  tabItem: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
});
