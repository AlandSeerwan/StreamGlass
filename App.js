import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Bookmark, Home, Search } from "lucide-react-native";

import DetailScreen from "./Screens/DetailScreen";
import HomeScreen from "./Screens/HomeScreen";
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
        tabBarStyle: { backgroundColor: "#000", borderTopWidth: 0 },
        tabBarActiveTintColor: "#fff",
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <Search color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="WatchlistTab"
        component={WatchlistScreen}
        options={{
          title: "Watchlist",
          tabBarIcon: ({ color }) => <Bookmark color={color} size={24} />,
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
