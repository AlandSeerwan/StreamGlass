import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { searchMedia } from "../services/api";

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  useEffect(() => {
    const timer = setTimeout(
      () =>
        searchMedia(query)
          .then(setResults)
          .catch(() => setResults([])),
      350,
    );
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <View style={styles.container}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search movies and series"
        placeholderTextColor="#8E8E93"
        style={styles.input}
      />
      <FlatList
        data={results}
        numColumns={3}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => `${item.media_type}-${item.id}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              navigation.navigate("Details", {
                id: item.id,
                type: item.media_type,
              })
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
          query ? <Text style={styles.empty}>No results found</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", paddingTop: 56 },
  input: {
    margin: 20,
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#171717",
    color: "#fff",
    fontSize: 16,
  },
  list: { paddingHorizontal: 10 },
  item: { width: "33.33%", padding: 10 },
  poster: { width: "100%", aspectRatio: 0.68, borderRadius: 12 },
  title: { color: "#fff", marginTop: 8 },
  empty: { color: "#8E8E93", textAlign: "center", marginTop: 40 },
});
