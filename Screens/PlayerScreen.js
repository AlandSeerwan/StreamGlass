import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import { ArrowLeft, RefreshCw, AlertCircle } from "lucide-react-native";
import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { saveToHistory } from "../services/storage";
import { extractStream } from "../services/extractor";

export default function PlayerScreen({ route, navigation }) {
  const {
    id,
    type = "movie",
    season = 1,
    episode = 1,
    title = "StreamGlass",
    poster_path,
    streamUrl: initialStreamUrl,
    streamHeaders: initialHeaders,
  } = route.params || {};

  const [activeStreamUrl, setActiveStreamUrl] = useState(initialStreamUrl || null);
  const [activeHeaders, setActiveHeaders] = useState(initialHeaders || null);
  const [subtitles, setSubtitles] = useState([]);
  const [loading, setLoading] = useState(!initialStreamUrl);
  const [statusMessage, setStatusMessage] = useState(
    initialStreamUrl ? "Starting playback..." : "Extracting stream from serverless provider..."
  );
  const [error, setError] = useState(null);

  const player = useVideoPlayer(
    activeStreamUrl ? { uri: activeStreamUrl, headers: activeHeaders || {} } : null,
    (createdPlayer) => {
      createdPlayer.keepScreenOnWhilePlaying = true;
      if (activeStreamUrl) {
        createdPlayer.play();
      }
    }
  );

  const resolveStream = useCallback(async () => {
    if (initialStreamUrl) {
      setActiveStreamUrl(initialStreamUrl);
      setActiveHeaders(initialHeaders);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage("Connecting to VidSrc serverless extractor...");

    try {
      setStatusMessage("Extracting HLS stream & subtitles...");
      const result = await extractStream({ id, type, season, episode });

      if (result && result.streamUrl) {
        setActiveStreamUrl(result.streamUrl);
        setActiveHeaders(result.headers || {});
        if (result.subtitles) setSubtitles(result.subtitles);
        setStatusMessage("Stream resolved. Loading native player...");

        if (player) {
          player.replace({
            uri: result.streamUrl,
            headers: result.headers || {},
          });
          player.play();
        }
        setLoading(false);
      } else {
        throw new Error("No playable HLS stream found in extractor response.");
      }
    } catch (err) {
      setError(
        err.message ||
          "Failed to extract direct stream. Please check your extractor instance or connection."
      );
      setLoading(false);
    }
  }, [id, type, season, episode, initialStreamUrl, initialHeaders, player]);

  useEffect(() => {
    resolveStream();
  }, [resolveStream]);

  useEffect(() => {
    saveToHistory({
      id,
      type,
      season: type === "tv" ? season : undefined,
      episode: type === "tv" ? episode : undefined,
      title,
      poster_path,
    }).catch(() => {});
  }, [id, type, season, episode, title, poster_path]);

  return (
    <View style={styles.container}>
      <StatusBar hidden style="light" />

      {activeStreamUrl && !loading && !error ? (
        <View style={styles.videoFrame}>
          <VideoView
            player={player}
            style={styles.video}
            nativeControls
            contentFit="contain"
            fullscreenOptions={{ enable: true }}
            allowsPictureInPicture
            surfaceType="surfaceView"
          />
          <Pressable
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeft color="#fff" size={22} />
          </Pressable>
          <View pointerEvents="none" style={styles.titleOverlay}>
            <Text numberOfLines={1} style={styles.titleText}>
              {title}
              {type === "tv" ? ` - S${season} E${episode}` : ""}
            </Text>
          </View>
        </View>
      ) : loading ? (
        <View style={styles.centerContainer}>
          <Pressable
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={() => navigation.goBack()}
            style={styles.backButtonTop}
          >
            <ArrowLeft color="#fff" size={22} />
          </Pressable>

          <BlurView tint="dark" intensity={90} style={styles.glassCard}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingTitle}>StreamGlass Player</Text>
            <Text style={styles.loadingSubtitle}>{title}</Text>
            {type === "tv" && (
              <Text style={styles.episodeBadge}>
                Season {season} • Episode {episode}
              </Text>
            )}
            <Text style={styles.statusText}>{statusMessage}</Text>
          </BlurView>
        </View>
      ) : (
        <View style={styles.centerContainer}>
          <Pressable
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={() => navigation.goBack()}
            style={styles.backButtonTop}
          >
            <ArrowLeft color="#fff" size={22} />
          </Pressable>

          <BlurView tint="dark" intensity={90} style={styles.glassCard}>
            <AlertCircle color="#FF453A" size={42} style={{ marginBottom: 12 }} />
            <Text style={styles.errorTitle}>Stream Extraction Failed</Text>
            <Text style={styles.errorMessage}>{error}</Text>

            <Pressable
              style={styles.retryButton}
              onPress={resolveStream}
              android_ripple={{ color: "rgba(0,0,0,0.15)" }}
            >
              <RefreshCw color="#000000" size={18} style={{ marginRight: 8 }} />
              <Text style={styles.retryText}>Retry Extraction</Text>
            </Pressable>
          </BlurView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  videoFrame: { flex: 1, backgroundColor: "#000000" },
  video: { flex: 1 },
  backButton: {
    position: "absolute",
    top: 24,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    zIndex: 10,
  },
  backButtonTop: {
    position: "absolute",
    top: 24,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    zIndex: 10,
  },
  titleOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  titleText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#000000",
  },
  glassCard: {
    width: "100%",
    maxWidth: 360,
    padding: 28,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
  },
  loadingTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 18,
    textAlign: "center",
  },
  loadingSubtitle: {
    color: "#8E8E93",
    fontSize: 15,
    marginTop: 4,
    textAlign: "center",
  },
  episodeBadge: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 100,
    marginTop: 8,
  },
  statusText: {
    color: "#8E8E93",
    fontSize: 13,
    marginTop: 16,
    textAlign: "center",
    lineHeight: 18,
  },
  errorTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
  },
  errorMessage: {
    color: "#8E8E93",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 100,
  },
  retryText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "700",
  },
});
