import { Image } from "expo-image";
import { useCallback, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getWatchlist } from "../services/storage";

export default function WatchlistScreen({ navigation }) {
  const [items, setItems] = useState([]);
  useFocusEffect(
    useCallback(() => {
      getWatchlist().then(setItems);
    }, []),
  );
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Watchlist</Text>
      <FlatList
        data={items}
        numColumns={3}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              navigation.navigate("Details", { id: item.id, type: item.type })
            }
          >
            <Image
              source={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
              style={styles.poster}
            />
            <Text numberOfLines={1} style={styles.title}>
              {item.title || item.name}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Your watchlist is empty</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 56 },
  heading: { color: "#fff", fontSize: 28, fontWeight: "bold", margin: 20 },
  list: { paddingHorizontal: 10 },
  item: { width: "33.33%", padding: 10 },
  poster: { width: "100%", aspectRatio: 0.68, borderRadius: 12 },
  title: { color: "#fff", marginTop: 8 },
  empty: { color: "#8E8E93", textAlign: "center", marginTop: 40 },
});
