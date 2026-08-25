import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Play,
  Star,
  Film,
  Tv,
  Calendar,
  Layers,
  X,
  ChevronDown,
  Sparkles,
} from "lucide-react-native";
import { getDetails, getSeason, getAnimeDetails, getImageUrl } from "../services/api";
import {
  checkIsInWatchlist,
  saveToHistory,
  toggleWatchlist,
} from "../services/storage";

const { width, height } = Dimensions.get("window");

export default function DetailScreen({ route, navigation }) {
  const { id, type = "movie", item: initialItem } = route.params;
  const [item, setItem] = useState(initialItem || null);
  const [saved, setSaved] = useState(false);
  const [season, setSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [seasonModalVisible, setSeasonModalVisible] = useState(false);
  const [audioTrack, setAudioTrack] = useState("sub"); // 'sub' or 'dub'

  const isAnime = type === "anime";

  useEffect(() => {
    if (isAnime) {
      getAnimeDetails(id)
        .then((animeData) => {
          if (animeData) {
            setItem(animeData);
            const totalEps = animeData.episodes || 12;
            const generatedEps = Array.from({ length: totalEps }, (_, i) => ({
              id: i + 1,
              episode_number: i + 1,
              name: `Episode ${i + 1}`,
            }));
            setEpisodes(generatedEps);
          }
        })
        .catch(() => {});
      checkIsInWatchlist(id, "anime").then(setSaved);
    } else {
      getDetails(id, type)
        .then((data) => {
          setItem(data);
          checkIsInWatchlist(id, type).then(setSaved);
          if (type === "tv") {
            getSeason(id, 1)
              .then((sData) => setEpisodes(sData.episodes || []))
              .catch(() => setEpisodes([]));
          }
        })
        .catch(() => {});
    }
  }, [id, type, isAnime]);

  if (!item) {
    return (
      <View style={styles.loadingContainer}>
        <BlurView tint="dark" intensity={85} style={styles.loadingCard}>
          <Text style={styles.loadingText}>Loading Details...</Text>
        </BlurView>
      </View>
    );
  }

  const title = isAnime
    ? item.title?.english || item.title?.romaji || item.title?.native || "Anime"
    : item.title || item.name || "Untitled";

  const releaseYear = isAnime
    ? String(item.seasonYear || "")
    : (item.release_date || item.first_air_date || "").slice(0, 4);

  const backdropUrl = isAnime
    ? item.bannerImage || item.coverImage?.extraLarge || item.coverImage?.large
    : getImageUrl(item.backdrop_path || item.poster_path, "w1280");

  const posterPath = isAnime
    ? item.coverImage?.extraLarge || item.coverImage?.large
    : item.poster_path;

  const score = isAnime
    ? item.averageScore ? (item.averageScore / 10).toFixed(1) : null
    : item.vote_average ? item.vote_average.toFixed(1) : null;

  const castList = !isAnime ? item.credits?.cast?.slice(0, 15) || [] : [];
  const recommendations = !isAnime
    ? item.recommendations?.results?.slice(0, 10) ||
      item.similar?.results?.slice(0, 10) ||
      []
    : [];

  const play = async (episodeNum) => {
    const epToPlay = episodeNum || 1;
    await saveToHistory({
      id,
      type,
      title,
      poster_path: posterPath,
      season: type === "tv" ? season : undefined,
      episode: type === "tv" || isAnime ? epToPlay : undefined,
    });

    navigation.navigate("Player", {
      id,
      type,
      title,
      poster_path: posterPath,
      season: type === "tv" ? season : undefined,
      episode: type === "tv" || isAnime ? epToPlay : undefined,
      isAnime,
      audioTrack,
    });
  };

  const loadSeason = (nextSeason) => {
    setSeason(nextSeason);
    setSeasonModalVisible(false);
    getSeason(id, nextSeason)
      .then((data) => setEpisodes(data.episodes || []))
      .catch(() => setEpisodes([]));
  };

  const handleToggleWatchlist = async () => {
    const res = await toggleWatchlist({
      id,
      type,
      title,
      poster_path: posterPath,
    });
    setSaved(res.exists);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Fullscreen Hero Backdrop */}
        <View style={styles.heroBackdropContainer}>
          {backdropUrl && (
            <Image
              source={{ uri: backdropUrl }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              priority="high"
            />
          )}
          <View pointerEvents="none" style={styles.heroGradient} />

          {/* Top Floating Glass Navigation Island */}
          <View style={styles.topNav}>
            <Pressable
              accessibilityLabel="Go back"
              hitSlop={12}
              onPress={() => navigation.goBack()}
              style={styles.navButton}
            >
              <ArrowLeft color="#FFFFFF" size={20} />
            </Pressable>

            <Pressable
              accessibilityLabel="Bookmark"
              hitSlop={12}
              onPress={handleToggleWatchlist}
              style={styles.navButton}
            >
              {saved ? (
                <BookmarkCheck color="#30D158" size={20} />
              ) : (
                <Bookmark color="#FFFFFF" size={20} />
              )}
            </Pressable>
          </View>
        </View>

        {/* Liquid Glass Detail Panel */}
        <BlurView tint="dark" intensity={90} style={styles.panel}>
          <Text style={styles.title}>{title}</Text>

          {/* Metadata Row */}
          <View style={styles.metaRow}>
            {score ? (
              <View style={styles.ratingBadge}>
                <Star color="#FFD700" size={12} fill="#FFD700" style={{ marginRight: 4 }} />
                <Text style={styles.ratingText}>{score}</Text>
              </View>
            ) : null}

            {releaseYear ? (
              <View style={styles.metaPill}>
                <Calendar color="#8E8E93" size={12} style={{ marginRight: 4 }} />
                <Text style={styles.metaPillText}>{releaseYear}</Text>
              </View>
            ) : null}

            <View style={styles.metaPill}>
              {isAnime ? (
                <>
                  <Sparkles color="#FF2D55" size={12} style={{ marginRight: 4 }} />
                  <Text style={styles.metaPillText}>
                    {item.episodes || 12} Episodes
                  </Text>
                </>
              ) : type === "tv" ? (
                <>
                  <Tv color="#8E8E93" size={12} style={{ marginRight: 4 }} />
                  <Text style={styles.metaPillText}>
                    {item.number_of_seasons || 1} {item.number_of_seasons === 1 ? "Season" : "Seasons"}
                  </Text>
                </>
              ) : (
                <>
                  <Film color="#8E8E93" size={12} style={{ marginRight: 4 }} />
                  <Text style={styles.metaPillText}>{item.runtime || 0} min</Text>
                </>
              )}
            </View>
          </View>

          {/* Genres Row */}
          {item.genres && item.genres.length > 0 && (
            <View style={styles.genresRow}>
              {item.genres.map((g, idx) => (
                <View key={idx} style={styles.genreTag}>
                  <Text style={styles.genreTagText}>{typeof g === "string" ? g : g.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Anime Sub/Dub Option */}
          {isAnime && (
            <View style={styles.audioToggleRow}>
              <Text style={styles.audioToggleLabel}>Audio:</Text>
              <TouchableOpacity
                style={[styles.audioPill, audioTrack === "sub" && styles.audioPillActive]}
                onPress={() => setAudioTrack("sub")}
              >
                <Text style={[styles.audioPillText, audioTrack === "sub" && styles.audioPillTextActive]}>
                  SUB
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.audioPill, audioTrack === "dub" && styles.audioPillActive]}
                onPress={() => setAudioTrack("dub")}
              >
                <Text style={[styles.audioPillText, audioTrack === "dub" && styles.audioPillTextActive]}>
                  DUB
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Primary Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.playBtn}
              activeOpacity={0.88}
              onPress={() => play(1)}
            >
              <Play color="#000000" size={18} fill="#000000" style={{ marginRight: 8 }} />
              <Text style={styles.playBtnText}>Play Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              activeOpacity={0.85}
              onPress={handleToggleWatchlist}
            >
              {saved ? (
                <>
                  <BookmarkCheck color="#30D158" size={18} style={{ marginRight: 6 }} />
                  <Text style={[styles.saveBtnText, { color: "#30D158" }]}>Saved</Text>
                </>
              ) : (
                <>
                  <Bookmark color="#FFFFFF" size={18} style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Watchlist</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Synopsis */}
          <Text style={styles.sectionHeader}>Synopsis</Text>
          <Text style={styles.overview}>
            {item.description
              ? item.description.replace(/<[^>]*>?/gm, "")
              : item.overview || "No synopsis available for this title."}
          </Text>

          {/* TV & Anime Episodes Section */}
          {(type === "tv" || isAnime) && (
            <View style={styles.tvSection}>
              <View style={styles.seasonHeaderRow}>
                <Text style={styles.sectionHeader}>Episodes</Text>
                {type === "tv" && !isAnime && (
                  <TouchableOpacity
                    style={styles.seasonSelectPill}
                    activeOpacity={0.85}
                    onPress={() => setSeasonModalVisible(true)}
                  >
                    <Layers color="#FFFFFF" size={14} style={{ marginRight: 6 }} />
                    <Text style={styles.seasonSelectText}>Season {season}</Text>
                    <ChevronDown color="#8E8E93" size={14} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                )}
              </View>

              {episodes.map((ep) => (
                <TouchableOpacity
                  key={ep.id || ep.episode_number}
                  style={styles.episodeCard}
                  activeOpacity={0.85}
                  onPress={() => play(ep.episode_number)}
                >
                  <View style={styles.episodeNumberBadge}>
                    <Text style={styles.episodeNumberText}>{ep.episode_number}</Text>
                  </View>
                  <View style={styles.episodeInfo}>
                    <Text numberOfLines={1} style={styles.episodeTitle}>
                      {ep.name || `Episode ${ep.episode_number}`}
                    </Text>
                    {ep.overview ? (
                      <Text numberOfLines={2} style={styles.episodeOverview}>
                        {ep.overview}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.episodePlayIcon}>
                    <Play color="#FFFFFF" size={12} fill="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Cast Carousel (Movies/TV) */}
          {castList.length > 0 && (
            <View style={styles.castSection}>
              <Text style={styles.sectionHeader}>Top Cast</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={castList}
                keyExtractor={(cast) => `cast-${cast.id}`}
                contentContainerStyle={styles.castContent}
                renderItem={({ item: cast }) => {
                  const avatarUrl = getImageUrl(cast.profile_path, "w185");
                  return (
                    <View style={styles.castCard}>
                      <Image
                        source={{ uri: avatarUrl }}
                        style={styles.castAvatar}
                        contentFit="cover"
                      />
                      <Text numberOfLines={1} style={styles.castName}>
                        {cast.name}
                      </Text>
                      <Text numberOfLines={1} style={styles.castCharacter}>
                        {cast.character}
                      </Text>
                    </View>
                  );
                }}
              />
            </View>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={styles.sectionHeader}>More Like This</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={recommendations}
                keyExtractor={(rec) => `rec-${rec.id}`}
                contentContainerStyle={styles.recommendationsContent}
                renderItem={({ item: rec }) => {
                  const recPosterUrl = getImageUrl(rec.poster_path, "w500");
                  return (
                    <TouchableOpacity
                      style={styles.recCard}
                      activeOpacity={0.85}
                      onPress={() =>
                        navigation.push("Details", {
                          id: rec.id,
                          type: rec.media_type || type,
                        })
                      }
                    >
                      <Image
                        source={{ uri: recPosterUrl }}
                        style={styles.recPoster}
                        contentFit="cover"
                      />
                      <Text numberOfLines={1} style={styles.recTitle}>
                        {rec.title || rec.name}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}
        </BlurView>
      </ScrollView>

      {/* Season Selection Modal */}
      {type === "tv" && !isAnime && (
        <Modal
          visible={seasonModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSeasonModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <BlurView tint="dark" intensity={95} style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Season</Text>
                <TouchableOpacity
                  onPress={() => setSeasonModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <X color="#FFFFFF" size={18} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 300 }}>
                {Array.from(
                  { length: item.number_of_seasons || 1 },
                  (_, i) => (
                    <TouchableOpacity
                      key={i + 1}
                      style={[
                        styles.seasonModalItem,
                        season === i + 1 && styles.seasonModalItemSelected,
                      ]}
                      onPress={() => loadSeason(i + 1)}
                    >
                      <Text
                        style={[
                          styles.seasonModalItemText,
                          season === i + 1 && styles.seasonModalItemTextSelected,
                        ]}
                      >
                        Season {i + 1}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </ScrollView>
            </BlurView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  loadingText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },

  heroBackdropContainer: {
    width: "100%",
    height: height * 0.45,
    position: "relative",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 36,
    paddingHorizontal: 20,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },

  panel: {
    padding: 22,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  ratingText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 100,
  },
  metaPillText: { color: "#8E8E93", fontSize: 11, fontWeight: "600" },
  genresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 6,
  },
  genreTag: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  genreTagText: { color: "#8E8E93", fontSize: 11, fontWeight: "600" },

  audioToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 8,
  },
  audioToggleLabel: {
    color: "#8E8E93",
    fontSize: 13,
    fontWeight: "700",
  },
  audioPill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  audioPillActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  audioPillText: {
    color: "#8E8E93",
    fontSize: 12,
    fontWeight: "800",
  },
  audioPillTextActive: {
    color: "#000000",
  },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },
  playBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 13,
    borderRadius: 100,
  },
  playBtnText: { color: "#000000", fontSize: 15, fontWeight: "800" },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 13,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  sectionHeader: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 14,
  },
  overview: {
    color: "#8E8E93",
    fontSize: 14,
    lineHeight: 22,
  },

  tvSection: { marginTop: 10 },
  seasonHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  seasonSelectPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  seasonSelectText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  episodeCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  episodeNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  episodeNumberText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  episodeInfo: { flex: 1, marginRight: 10 },
  episodeTitle: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  episodeOverview: { color: "#8E8E93", fontSize: 12, marginTop: 2 },
  episodePlayIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  castSection: { marginTop: 14 },
  castContent: { gap: 12, paddingVertical: 8 },
  castCard: { width: 85, alignItems: "center" },
  castAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#161618",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    marginBottom: 6,
  },
  castName: { color: "#FFFFFF", fontSize: 11, fontWeight: "700", textAlign: "center" },
  castCharacter: { color: "#8E8E93", fontSize: 10, textAlign: "center" },

  recommendationsSection: { marginTop: 14, marginBottom: 30 },
  recommendationsContent: { gap: 12, paddingVertical: 8 },
  recCard: { width: 115 },
  recPoster: {
    width: 115,
    height: 165,
    borderRadius: 14,
    backgroundColor: "#161618",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginBottom: 6,
  },
  recTitle: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  seasonModalItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 6,
  },
  seasonModalItemSelected: {
    backgroundColor: "#FFFFFF",
  },
  seasonModalItemText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  seasonModalItemTextSelected: {
    color: "#000000",
  },
});
