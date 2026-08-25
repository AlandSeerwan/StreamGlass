import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Sparkles, Star } from "lucide-react-native";
import { getTrendingAnime } from "../services/api";

export default function AnimeScreen({ navigation }) {
  const [animeList, setAnimeList] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnime = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const results = await getTrendingAnime(pageNum, 24);
      setAnimeList((prev) => (append ? [...prev, ...results] : results));
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnime(1, false);
    setPage(1);
  }, [fetchAnime]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnime(1, false);
    setPage(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchAnime(nextPage, true);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Sparkles color="#FF2D55" size={24} style={{ marginRight: 10 }} />
          <Text style={styles.headerTitle}>Anime</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Trending Japanese animation via AniList
        </Text>
      </View>

      {/* 3-Column Grid */}
      <FlatList
        data={animeList}
        keyExtractor={(item, index) => `anime-${item.id}-${index}`}
        numColumns={3}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        initialNumToRender={9}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
        renderItem={({ item }) => {
          const title =
            item.title?.english || item.title?.romaji || item.title?.native || "Anime";
          const coverUrl =
            item.coverImage?.extraLarge || item.coverImage?.large;
          const score = item.averageScore ? (item.averageScore / 10).toFixed(1) : null;

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => {
                navigation.navigate("Details", {
                  id: item.id,
                  type: "anime",
                  item,
                });
              }}
            >
              <Image
                source={{ uri: coverUrl }}
                style={styles.poster}
                contentFit="cover"
                transition={250}
              />

              {score ? (
                <BlurView tint="dark" intensity={80} style={styles.ratingBadge}>
                  <Star color="#FFD700" size={10} fill="#FFD700" style={{ marginRight: 3 }} />
                  <Text style={styles.ratingText}>{score}</Text>
                </BlurView>
              ) : null}

              <Text numberOfLines={1} style={styles.cardTitle}>
                {title}
              </Text>
              {item.episodes ? (
                <Text style={styles.episodesSub}>{item.episodes} EPS</Text>
              ) : null}
            </TouchableOpacity>
          );
        }}
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
  ratingBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 100,
    overflow: "hidden",
  },
  ratingText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  episodesSub: {
    color: "#8E8E93",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
});
