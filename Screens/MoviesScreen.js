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
import { Film, Star, Sparkles } from "lucide-react-native";
import { getPopularMovies, getMoviesByGenre, getImageUrl } from "../services/api";

const MOVIE_GENRES = [
  { id: 0, name: "All Popular" },
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 878, name: "Sci-Fi" },
  { id: 27, name: "Horror" },
  { id: 35, name: "Comedy" },
  { id: 18, name: "Drama" },
  { id: 16, name: "Animation" },
  { id: 53, name: "Thriller" },
];

export default function MoviesScreen({ navigation }) {
  const [selectedGenre, setSelectedGenre] = useState(0);
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMovies = useCallback(async (genreId, pageNum = 1, append = false) => {
    setLoading(true);
    try {
      let results = [];
      if (genreId === 0) {
        results = await getPopularMovies(pageNum);
      } else {
        results = await getMoviesByGenre(genreId, pageNum);
      }
      setMovies((prev) => (append ? [...prev, ...results] : results));
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovies(selectedGenre, 1, false);
    setPage(1);
  }, [selectedGenre, fetchMovies]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMovies(selectedGenre, 1, false);
    setPage(1);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMovies(selectedGenre, nextPage, true);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Film color="#FFFFFF" size={24} style={{ marginRight: 10 }} />
          <Text style={styles.headerTitle}>Movies</Text>
        </View>
        <Text style={styles.headerSubtitle}>Explore thousands of cinema titles</Text>
      </View>

      {/* Genre Pills */}
      <View style={styles.genreListContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={MOVIE_GENRES}
          keyExtractor={(item) => `genre-${item.id}`}
          contentContainerStyle={styles.genreList}
          renderItem={({ item }) => {
            const isSelected = selectedGenre === item.id;
            return (
              <TouchableOpacity
                style={[styles.genrePill, isSelected && styles.genrePillSelected]}
                onPress={() => setSelectedGenre(item.id)}
              >
                <Text
                  style={[
                    styles.genrePillText,
                    isSelected && styles.genrePillTextSelected,
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 3-Column Grid */}
      <FlatList
        data={movies}
        keyExtractor={(item, index) => `movie-${item.id}-${index}`}
        numColumns={3}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
          />
        }
        renderItem={({ item }) => {
          const posterUrl = getImageUrl(item.poster_path, "w500");
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("Details", { id: item.id, type: "movie" })
              }
            >
              <Image
                source={{ uri: posterUrl }}
                style={styles.poster}
                contentFit="cover"
                transition={250}
              />
              {item.vote_average ? (
                <BlurView tint="dark" intensity={80} style={styles.ratingBadge}>
                  <Star color="#FFD700" size={10} fill="#FFD700" style={{ marginRight: 3 }} />
                  <Text style={styles.ratingText}>{item.vote_average.toFixed(1)}</Text>
                </BlurView>
              ) : null}
              <Text numberOfLines={1} style={styles.cardTitle}>
                {item.title}
              </Text>
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
    paddingBottom: 14,
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
  genreListContainer: {
    marginBottom: 14,
  },
  genreList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  genrePill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  genrePillSelected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  genrePillText: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "600",
  },
  genrePillTextSelected: {
    color: "#000000",
    fontWeight: "700",
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
});
