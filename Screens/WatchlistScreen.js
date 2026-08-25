import { BlurView } from "expo-blur";
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
import { Bookmark, Star } from "lucide-react-native";
import { getWatchlist } from "../services/storage";
import { getImageUrl } from "../services/api";

export default function WatchlistScreen({ navigation }) {
  const [items, setItems] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getWatchlist()
        .then(setItems)
        .catch(() => setItems([]));
    }, [])
  );

  const getPosterUrl = (item) => {
    // Handle AniList anime posters (already full URLs)
    if (item?.poster_path?.startsWith("http")) {
      return item.poster_path;
    }
    // TMDB posters
    return getImageUrl(item?.poster_path, "w500");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Bookmark color="#FFFFFF" size={24} style={{ marginRight: 10 }} />
          <Text style={styles.headerTitle}>My Watchlist</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {items.length > 0
            ? `${items.length} title${items.length !== 1 ? "s" : ""} saved`
            : "Save titles to watch later"}
        </Text>
      </View>

      {/* Grid */}
      <FlatList
        data={items}
        numColumns={3}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={items.length > 0 ? styles.gridRow : undefined}
        keyExtractor={(item) => `${item?.type ?? "item"}-${item?.id}`}
        initialNumToRender={9}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        renderItem={({ item }) => {
          const posterUrl = getPosterUrl(item);
          const title = item?.title || item?.name || "Untitled";

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("Details", {
                  id: item?.id,
                  type: item?.type || "movie",
                })
              }
            >
              <Image
                source={{ uri: posterUrl }}
                style={styles.poster}
                contentFit="cover"
                transition={300}
                recyclingKey={`watchlist-${item?.id}`}
              />
              {item?.type && (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {item.type === "anime"
                      ? "ANIME"
                      : item.type === "tv"
                        ? "TV"
                        : "MOVIE"}
                  </Text>
                </View>
              )}
              <Text numberOfLines={1} style={styles.cardTitle}>
                {title}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Bookmark color="#8E8E93" size={48} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No titles saved yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the bookmark icon on any movie, series, or anime to add it here.
            </Text>
          </View>
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
    paddingBottom: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: "#8E8E93",
    fontSize: 14,
    marginTop: 4,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    flexGrow: 1,
  },
  gridRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  card: {
    width: "31%",
  },
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
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#8E8E93",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
});
