import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  getTopRatedMovies,
  getTopRatedSeries,
  getTrending,
  getTrendingSeries,
} from "../services/api";
import { getHistory, saveToHistory } from "../services/storage";

const { height } = Dimensions.get("window");
export default function HomeScreen({ navigation }) {
  const [trending, setTrending] = useState([]);
  const [topMovies, setTopMovies] = useState([]);
  const [trendingSeries, setTrendingSeries] = useState([]);
  const [topSeries, setTopSeries] = useState([]);
  const [history, setHistory] = useState([]);
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  useEffect(() => {
    let isActive = true;

    Promise.allSettled([
      getTrending(),
      getTopRatedMovies(),
      getTrendingSeries(),
      getTopRatedSeries(),
      getHistory(),
    ])
      .then((results) => {
        if (isActive) {
          const valueOr = (index, fallback) =>
            results[index].status === "fulfilled"
              ? results[index].value
              : fallback;
          setTrending(valueOr(0, []));
          setTopMovies(valueOr(1, []));
          setTrendingSeries(valueOr(2, []));
          setTopSeries(valueOr(3, []));
          setHistory(valueOr(4, []));
        }
      })
      .catch((err) => isActive && console.warn(err));

    return () => {
      isActive = false;
    };
  }, []);

  const heroMovie = trending[0];
  const typeFor = (item) => item.media_type || item.type || "movie";
  const titleFor = (item) => item.title || item.name || "Featured title";
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
      streamUrl: item.streamUrl,
    });
  };
  const openDetails = (item) =>
    navigation.navigate("Details", { id: item.id, type: typeFor(item) });
  const renderRow = (title, data) => (
    <View>
      <Text style={styles.rowTitle}>{title}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={data}
        keyExtractor={(item) => `${typeFor(item)}-${item.id}`}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openDetails(item)}>
            <Image
              source={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
              style={styles.poster}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {heroMovie && (
        <View style={styles.heroSection}>
          <Image
            source={`https://image.tmdb.org/t/p/w1280${
              heroImageFailed
                ? heroMovie.poster_path
                : heroMovie.backdrop_path || heroMovie.poster_path
            }`}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            onError={() => setHeroImageFailed(true)}
          />
          <View pointerEvents="none" style={styles.heroShade} />
          <BlurView intensity={80} tint="dark" style={styles.glassPill}>
            <Text style={styles.heroKicker}>
              Featured {typeFor(heroMovie) === "tv" ? "Series" : "Movie"}
            </Text>
            <Text style={styles.heroTitle}>{titleFor(heroMovie)}</Text>
            <TouchableOpacity
              style={styles.playBtn}
              onPress={() =>
                typeFor(heroMovie) === "tv"
                  ? openDetails(heroMovie)
                  : playItem(heroMovie)
              }
            >
              <Text style={styles.playText}>Watch Now</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      )}

      {history.length > 0 && renderRow("Continue Watching", history)}
      {renderRow(
        "Trending Movies",
        trending.filter((item) => typeFor(item) === "movie"),
      )}
      {renderRow("Top Rated Movies", topMovies)}
      {renderRow("Trending Series", trendingSeries)}
      {renderRow("Top Rated Series", topSeries)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  heroSection: {
    height: height * 0.6,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
  },
  heroShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.34)",
  },
  glassPill: {
    width: "85%",
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    overflow: "hidden",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  heroKicker: {
    color: "#8E8E93",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  playBtn: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
  },
  playText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  rowTitle: { color: "#fff", fontSize: 20, fontWeight: "bold", margin: 20 },
  poster: { width: 130, height: 195, borderRadius: 12, marginLeft: 20 },
});
