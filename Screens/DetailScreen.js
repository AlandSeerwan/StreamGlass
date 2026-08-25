import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getDetails, getSeason } from "../services/api";
import {
  checkIsInWatchlist,
  saveToHistory,
  toggleWatchlist,
} from "../services/storage";

export default function DetailScreen({ route, navigation }) {
  const { id, type } = route.params;
  const [item, setItem] = useState(null);
  const [saved, setSaved] = useState(false);
  const [season, setSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  useEffect(() => {
    getDetails(id, type)
      .then((data) => {
        setItem(data);
        checkIsInWatchlist(id, type).then(setSaved);
      })
      .catch(() => {});
  }, [id, type]);
  if (!item)
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  const title = item.title || item.name;
  const play = async (episode) => {
    await saveToHistory({
      id,
      type,
      title,
      poster_path: item.poster_path,
      season,
      episode,
    });
    navigation.navigate("Player", {
      id,
      type,
      title,
      poster_path: item.poster_path,
      streamUrl: item.streamUrl,
      season: type === "tv" ? season : undefined,
      episode,
    });
  };
  const loadSeason = (nextSeason) => {
    setSeason(nextSeason);
    getSeason(id, nextSeason)
      .then((data) => setEpisodes(data.episodes || []))
      .catch(() => setEpisodes([]));
  };
  return (
    <ScrollView style={styles.container}>
      <Image
        source={`https://image.tmdb.org/t/p/w780${item.backdrop_path || item.poster_path}`}
        style={styles.backdrop}
        contentFit="cover"
      />
      <BlurView tint="dark" intensity={85} style={styles.panel}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>
          {type === "tv"
            ? `${item.number_of_seasons || 0} seasons`
            : `${item.runtime || 0} min`}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.play}
            onPress={() => play(type === "tv" ? 1 : undefined)}
          >
            <Text style={styles.playText}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.save}
            onPress={() =>
              toggleWatchlist({
                id,
                type,
                title,
                poster_path: item.poster_path,
              }).then((result) => setSaved(result.exists))
            }
          >
            <Text style={styles.saveText}>
              {saved ? "Saved" : "Add to Watchlist"}
            </Text>
          </TouchableOpacity>
        </View>
        {type === "tv" && (
          <View>
            <Text style={styles.section}>Seasons</Text>
            <View style={styles.seasons}>
              {Array.from(
                { length: item.number_of_seasons || 0 },
                (_, index) => (
                  <TouchableOpacity
                    key={index + 1}
                    style={[
                      styles.season,
                      season === index + 1 && styles.selected,
                    ]}
                    onPress={() => loadSeason(index + 1)}
                  >
                    <Text
                      style={[
                        styles.seasonText,
                        season === index + 1 && styles.selectedText,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
            {episodes.map((episode) => (
              <TouchableOpacity
                key={episode.id}
                style={styles.episode}
                onPress={() => play(episode.episode_number)}
              >
                <Text style={styles.episodeText}>
                  {episode.episode_number}. {episode.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={styles.overview}>
          {item.overview || "No synopsis available."}
        </Text>
      </BlurView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  loading: { color: "#fff", margin: 40 },
  backdrop: { width: "100%", height: 300 },
  panel: {
    padding: 22,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  title: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  meta: { color: "#8E8E93", marginTop: 8 },
  actions: { flexDirection: "row", marginVertical: 22, gap: 10 },
  play: {
    backgroundColor: "#fff",
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  playText: { color: "#000", fontWeight: "bold" },
  save: {
    borderWidth: 1,
    borderColor: "#fff",
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 24,
  },
  saveText: { color: "#fff" },
  section: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 10,
  },
  seasons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  season: {
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 20,
    padding: 10,
    minWidth: 42,
    alignItems: "center",
  },
  selected: { backgroundColor: "#fff", borderColor: "#fff" },
  seasonText: { color: "#fff" },
  selectedText: { color: "#000" },
  episode: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  episodeText: { color: "#ddd" },
  overview: { color: "#ddd", fontSize: 16, lineHeight: 24 },
});
