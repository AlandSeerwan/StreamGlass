import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useEffect, useState, useCallback } from "react";
import {
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Play,
  Info,
  Star,
  Film,
  Tv,
  Flame,
  Clock,
  Sparkles,
} from "lucide-react-native";
import {
  getTopRatedMovies,
  getTopRatedSeries,
  getTrending,
  getTrendingSeries,
  getImageUrl,
} from "../services/api";
import { getHistory, saveToHistory } from "../services/storage";

const { width, height } = Dimensions.get("window");

export default function HomeScreen({ navigation }) {
  const [trending, setTrending] = useState([]);
  const [topMovies, setTopMovies] = useState([]);
  const [trendingSeries, setTrendingSeries] = useState([]);
  const [topSeries, setTopSeries] = useState([]);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [
        trendingRes,
        topMoviesRes,
        trendingSeriesRes,
        topSeriesRes,
        historyRes,
      ] = await Promise.allSettled([
        getTrending(),
        getTopRatedMovies(),
        getTrendingSeries(),
        getTopRatedSeries(),
        getHistory(),
      ]);

      const valueOr = (res, fallback) =>
        res.status === "fulfilled" ? res.value : fallback;

      setTrending(valueOr(trendingRes, []));
      setTopMovies(valueOr(topMoviesRes, []));
      setTrendingSeries(valueOr(trendingSeriesRes, []));
      setTopSeries(valueOr(topSeriesRes, []));
      setHistory(valueOr(historyRes, []));
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const heroList = trending.slice(0, 5);
  const heroItem = heroList[heroIndex] || trending[0];

  const typeFor = (item) => item?.media_type || item?.type || "movie";
  const titleFor = (item) => item?.title || item?.name || "Featured Title";

  const playItem = async (item) => {
    const type = typeFor(item);
    try {
      await saveToHistory({
        id: item.id,
        type,
        title: titleFor(item),
        poster_path: item.poster_path,
      });
    } catch {}
    navigation.navigate("Player", {
      id: item.id,
      type,
      title: titleFor(item),
      poster_path: item.poster_path,
    });
  };

  const openDetails = (item) => {
    navigation.navigate("Details", { id: item.id, type: typeFor(item) });
  };

  const renderContinueWatching = () => {
    if (!history || history.length === 0) return null;

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Clock color="#FFFFFF" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Continue Watching</Text>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={history}
          keyExtractor={(item, index) => `history-${item.id}-${index}`}
          contentContainerStyle={styles.rowContent}
          renderItem={({ item }) => {
            const posterUrl = getImageUrl(item.poster_path, "w500");
            return (
              <TouchableOpacity
                style={styles.historyCard}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate("Player", {
                    id: item.id,
                    type: item.type || "movie",
                    title: item.title,
                    poster_path: item.poster_path,
                    season: item.season,
                    episode: item.episode,
                  })
                }
              >
                <Image
                  source={{ uri: posterUrl }}
                  style={styles.historyPoster}
                  contentFit="cover"
                  transition={250}
                />
                <BlurView tint="dark" intensity={80} style={styles.historyMeta}>
                  <Text numberOfLines={1} style={styles.historyTitle}>
                    {item.title}
                  </Text>
                  {item.type === "tv" && item.season && item.episode ? (
                    <Text style={styles.historySub}>
                      S{item.season} • E{item.episode}
                    </Text>
                  ) : (
                    <Text style={styles.historySub}>Movie</Text>
                  )}
                  <View style={styles.historyPlayIcon}>
                    <Play color="#000000" size={14} fill="#000000" />
                  </View>
                </BlurView>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  const renderMediaRow = (sectionTitle, icon, data) => {
    if (!data || data.length === 0) return null;

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          {icon}
          <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={data}
          keyExtractor={(item) => `${typeFor(item)}-${item.id}`}
          contentContainerStyle={styles.rowContent}
          renderItem={({ item }) => {
            const posterUrl = getImageUrl(item.poster_path, "w500");
            const rating = item.vote_average ? item.vote_average.toFixed(1) : null;

            return (
              <TouchableOpacity
                style={styles.posterCard}
                activeOpacity={0.85}
                onPress={() => openDetails(item)}
              >
                <Image
                  source={{ uri: posterUrl }}
                  style={styles.posterImage}
                  contentFit="cover"
                  transition={300}
                />
                {rating && (
                  <BlurView tint="dark" intensity={85} style={styles.ratingBadge}>
                    <Star color="#FFD700" size={11} fill="#FFD700" style={{ marginRight: 3 }} />
                    <Text style={styles.ratingText}>{rating}</Text>
                  </BlurView>
                )}
                <Text numberOfLines={1} style={styles.cardTitle}>
                  {titleFor(item)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  const heroBackdropUri = heroItem
    ? getImageUrl(heroItem.backdrop_path || heroItem.poster_path, "w1280")
    : null;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FFFFFF"
        />
      }
    >
      {/* Hero Spotlight Section */}
      {heroItem && (
        <View style={styles.heroSection}>
          {heroBackdropUri && (
            <Image
              source={{ uri: heroBackdropUri }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              priority="high"
              transition={400}
            />
          )}

          {/* OLED Contrast Gradient Vignette */}
          <View pointerEvents="none" style={styles.heroGradientOverlay} />

          {/* Floating Apple Liquid Glass Hero Card */}
          <BlurView tint="dark" intensity={85} style={styles.heroGlassCard}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroTypePill}>
                <Sparkles color="#FFFFFF" size={12} style={{ marginRight: 4 }} />
                <Text style={styles.heroTypePillText}>
                  {typeFor(heroItem) === "tv" ? "TV SERIES" : "FEATURED MOVIE"}
                </Text>
              </View>
              {heroItem.vote_average ? (
                <View style={styles.heroRatingPill}>
                  <Star color="#FFD700" size={12} fill="#FFD700" style={{ marginRight: 4 }} />
                  <Text style={styles.heroRatingText}>
                    {heroItem.vote_average.toFixed(1)}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text numberOfLines={2} style={styles.heroTitle}>
              {titleFor(heroItem)}
            </Text>

            {heroItem.overview ? (
              <Text numberOfLines={2} style={styles.heroOverview}>
                {heroItem.overview}
              </Text>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.heroActionRow}>
              <TouchableOpacity
                style={styles.heroPlayButton}
                activeOpacity={0.88}
                onPress={() =>
                  typeFor(heroItem) === "tv"
                    ? openDetails(heroItem)
                    : playItem(heroItem)
                }
              >
                <Play color="#000000" size={18} fill="#000000" style={{ marginRight: 6 }} />
                <Text style={styles.heroPlayText}>Watch Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroDetailsButton}
                activeOpacity={0.85}
                onPress={() => openDetails(heroItem)}
              >
                <Info color="#FFFFFF" size={18} style={{ marginRight: 6 }} />
                <Text style={styles.heroDetailsText}>Details</Text>
              </TouchableOpacity>
            </View>

            {/* Spotlight Pagination Dots */}
            {heroList.length > 1 && (
              <View style={styles.dotRow}>
                {heroList.map((_, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setHeroIndex(idx)}
                    style={[
                      styles.dot,
                      heroIndex === idx && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </BlurView>
        </View>
      )}

      {/* Rows */}
      {renderContinueWatching()}

      {renderMediaRow(
        "Trending Movies",
        <Flame color="#FF453A" size={20} style={{ marginRight: 8 }} />,
        trending.filter((item) => typeFor(item) === "movie")
      )}

      {renderMediaRow(
        "Top Rated Movies",
        <Film color="#0A84FF" size={20} style={{ marginRight: 8 }} />,
        topMovies
      )}

      {renderMediaRow(
        "Trending TV Series",
        <Tv color="#30D158" size={20} style={{ marginRight: 8 }} />,
        trendingSeries
      )}

      {renderMediaRow(
        "Top Rated TV Series",
        <Star color="#FFD700" size={20} fill="#FFD700" style={{ marginRight: 8 }} />,
        topSeries
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  heroSection: {
    height: height * 0.65,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 24,
    paddingHorizontal: 16,
    position: "relative",
  },
  heroGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
  },
  heroGlassCard: {
    width: "100%",
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    overflow: "hidden",
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  heroTypePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  heroTypePillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  heroRatingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  heroRatingText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  heroOverview: {
    color: "#8E8E93",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  heroActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroPlayButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 100,
  },
  heroPlayText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
  },
  heroDetailsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  heroDetailsText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  dotActive: {
    width: 20,
    backgroundColor: "#FFFFFF",
  },

  // Section Rows
  sectionContainer: {
    marginTop: 26,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  rowContent: {
    paddingLeft: 20,
    paddingRight: 10,
    gap: 14,
  },

  // Poster Cards
  posterCard: {
    width: 135,
    marginRight: 12,
  },
  posterImage: {
    width: 135,
    height: 200,
    borderRadius: 16,
    backgroundColor: "#161618",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  ratingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    overflow: "hidden",
  },
  ratingText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },

  // Continue Watching Card
  historyCard: {
    width: 200,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "#161618",
  },
  historyPoster: {
    ...StyleSheet.absoluteFillObject,
  },
  historyMeta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  historyTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  historySub: {
    color: "#8E8E93",
    fontSize: 11,
    marginTop: 2,
  },
  historyPlayIcon: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
});
