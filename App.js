import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  Film,
  Home,
  Search,
  Sparkles,
  Tv,
} from "lucide-react-native";
import { View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

import DetailScreen from "./Screens/DetailScreen";
import HomeScreen from "./Screens/HomeScreen";
import MoviesScreen from "./Screens/MoviesScreen";
import SeriesScreen from "./Screens/SeriesScreen";
import AnimeScreen from "./Screens/AnimeScreen";
import PlayerScreen from "./Screens/PlayerScreen";
import SearchScreen from "./Screens/SearchScreen";
import WatchlistScreen from "./Screens/WatchlistScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(0, 0, 0, 0.88)",
          borderTopWidth: 1,
          borderTopColor: "rgba(255, 255, 255, 0.12)",
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="MoviesTab"
        component={MoviesScreen}
        options={{
          title: "Movies",
          tabBarIcon: ({ color }) => <Film color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="SeriesTab"
        component={SeriesScreen}
        options={{
          title: "Series",
          tabBarIcon: ({ color }) => <Tv color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="AnimeTab"
        component={AnimeScreen}
        options={{
          title: "Anime",
          tabBarIcon: ({ color }) => <Sparkles color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <Search color={color} size={22} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: "fade" }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Player" component={PlayerScreen} />
        <Stack.Screen name="Details" component={DetailScreen} />
        <Stack.Screen name="Watchlist" component={WatchlistScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
