import { BlurView } from "expo-blur";
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
import { Search, X, Star, Sparkles } from "lucide-react-native";
import { searchMedia, getImageUrl } from "../services/api";

const QUICK_TAGS = [
  "Marvel",
  "Anime",
  "Batman",
  "Breaking Bad",
  "Star Wars",
  "Stranger Things",
];

export default function SearchScreen({ route, navigation }) {
  const [query, setQuery] = useState(route?.params?.initialQuery || "");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (route?.params?.initialQuery) {
      setQuery(route.params.initialQuery);
    }
  }, [route?.params?.initialQuery]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      searchMedia(query)
        .then((res) => setResults(res || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Glass Search Input Bar */}
      <BlurView tint="dark" intensity={85} style={styles.searchBar}>
        <Search color="#8E8E93" size={20} style={{ marginRight: 10 }} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Movies, TV shows, anime..."
          placeholderTextColor="#8E8E93"
          style={styles.input}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")} style={styles.clearBtn}>
            <X color="#FFFFFF" size={16} />
          </TouchableOpacity>
        ) : null}
      </BlurView>

      {/* Quick Search Suggestions */}
      {!query && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Popular Searches</Text>
          <View style={styles.tagsRow}>
            {QUICK_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.tagPill}
                onPress={() => setQuery(tag)}
              >
                <Text style={styles.tagPillText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Results Grid */}
      <FlatList
        data={results}
        numColumns={3}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.gridRow}
        keyExtractor={(item) => `${item.media_type}-${item.id}`}
        renderItem={({ item }) => {
          const posterUrl = getImageUrl(item.poster_path, "w500");
          const isTv = item.media_type === "tv";
          const rating = item.vote_average ? item.vote_average.toFixed(1) : null;

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("Details", {
                  id: item.id,
                  type: item.media_type,
                })
              }
            >
              <Image
                source={{ uri: posterUrl }}
                style={styles.poster}
                contentFit="cover"
                transition={250}
              />
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{isTv ? "TV" : "MOVIE"}</Text>
              </View>
              {rating && (
                <BlurView tint="dark" intensity={80} style={styles.ratingBadge}>
                  <Star color="#FFD700" size={9} fill="#FFD700" style={{ marginRight: 2 }} />
                  <Text style={styles.ratingText}>{rating}</Text>
                </BlurView>
              )}
              <Text numberOfLines={1} style={styles.title}>
                {item.title || item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          query && !searching ? (
            <Text style={styles.empty}>No matches found for "{query}"</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  header: {
    paddingTop: 48,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    overflow: "hidden",
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    padding: 0,
  },
  clearBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionsContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  suggestionsTitle: {
    color: "#8E8E93",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  tagPillText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  list: { paddingHorizontal: 16, paddingBottom: 30 },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  card: { width: "31%" },
  poster: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: 14,
    backgroundColor: "#161618",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  typeBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  typeBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
  },
  ratingBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 100,
    overflow: "hidden",
  },
  ratingText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  empty: {
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 48,
    fontSize: 15,
  },
});
