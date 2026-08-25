import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertCircle,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react-native";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
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
    isAnime: paramIsAnime = false,
    audioTrack = "sub",
    streamUrl: initialStreamUrl,
    streamHeaders: initialHeaders,
  } = route.params || {};

  const isAnime = type === "anime" || Boolean(paramIsAnime);

  const [activeStreamUrl, setActiveStreamUrl] = useState(initialStreamUrl || null);
  const [activeHeaders, setActiveHeaders] = useState(initialHeaders || null);
  const [isDirectVideo, setIsDirectVideo] = useState(
    initialStreamUrl ? /\.(m3u8|mp4|webm)(\?.*)?$/i.test(initialStreamUrl) : false
  );
  const [loading, setLoading] = useState(!initialStreamUrl);
  const [statusMessage, setStatusMessage] = useState(
    initialStreamUrl ? "Starting playback..." : "Connecting to stream provider..."
  );
  const [error, setError] = useState(null);

  // Custom HUD States
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [contentFit, setContentFit] = useState("contain");
  const hideControlsTimer = useRef(null);

  const player = useVideoPlayer(
    isDirectVideo && activeStreamUrl
      ? { uri: activeStreamUrl, headers: activeHeaders || {} }
      : null,
    (createdPlayer) => {
      createdPlayer.keepScreenOnWhilePlaying = true;
      if (isDirectVideo && activeStreamUrl) {
        createdPlayer.play();
      }
    }
  );

  // Controls auto-hide timer
  const resetHideTimer = useCallback(() => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    setControlsVisible(true);
    hideControlsTimer.current = setTimeout(() => {
      setControlsVisible(false);
    }, 4000);
  }, []);

  const toggleControls = () => {
    if (controlsVisible) {
      setControlsVisible(false);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    } else {
      resetHideTimer();
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours > 0) {
      return `${hours}:${remMins < 10 ? "0" : ""}${remMins}:${secs < 10 ? "0" : ""}${secs}`;
    }
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Video playback action handlers
  const handlePlayPause = () => {
    resetHideTimer();
    if (!player) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  };

  const handleSeekBy = (seconds) => {
    resetHideTimer();
    if (!player) return;
    if (typeof player.seekBy === "function") {
      player.seekBy(seconds);
    } else if (typeof player.currentTime === "number") {
      player.currentTime = Math.max(0, Math.min(player.currentTime + seconds, duration));
    }
  };

  const handleToggleMute = () => {
    resetHideTimer();
    if (!player) return;
    player.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleToggleFit = () => {
    resetHideTimer();
    setContentFit((prev) => (prev === "contain" ? "cover" : "contain"));
  };

  // Video player time & status tracking
  useEffect(() => {
    if (!player || !isDirectVideo) return;

    const interval = setInterval(() => {
      if (typeof player.currentTime === "number") {
        setCurrentTime(player.currentTime);
      }
      if (typeof player.duration === "number" && player.duration > 0) {
        setDuration(player.duration);
      }
      if (typeof player.playing === "boolean") {
        setIsPlaying(player.playing);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [player, isDirectVideo]);

  const resolveStream = useCallback(async () => {
    if (initialStreamUrl) {
      setActiveStreamUrl(initialStreamUrl);
      setActiveHeaders(initialHeaders);
      setIsDirectVideo(/\.(m3u8|mp4|webm)(\?.*)?$/i.test(initialStreamUrl));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage("Extracting stream for " + title + "...");

    try {
      const result = await extractStream({ id, type, season, episode, audioTrack });

      if (result && result.streamUrl) {
        const isDirect =
          result.isM3U8 || /\.(m3u8|mp4|webm)(\?.*)?$/i.test(result.streamUrl);

        setActiveStreamUrl(result.streamUrl);
        setActiveHeaders(result.headers || {});
        setIsDirectVideo(isDirect);
        setStatusMessage("Loading player...");

        if (isDirect && player) {
          if (typeof player.replaceAsync === "function") {
            await player.replaceAsync({
              uri: result.streamUrl,
              headers: result.headers || {},
            });
          } else if (typeof player.replace === "function") {
            player.replace({
              uri: result.streamUrl,
              headers: result.headers || {},
            });
          }
          player.play();
        }
        setLoading(false);
        resetHideTimer();
      } else {
        const fallbackUrl =
          type === "anime" || isAnime
            ? `https://megavid.buzz/ani/${id}/${episode || 1}/${audioTrack || 'sub'}?autoplay=true`
            : type === "tv"
              ? `https://vixsrc.to/tv/${id}/${season}/${episode}`
              : `https://vixsrc.to/movie/${id}`;

        setActiveStreamUrl(fallbackUrl);
        setIsDirectVideo(false);
        setLoading(false);
      }
    } catch {
      const fallbackUrl =
        type === "anime" || isAnime
          ? `https://megavid.buzz/ani/${id}/${episode || 1}/${audioTrack || 'sub'}?autoplay=true`
          : type === "tv"
            ? `https://vixsrc.to/tv/${id}/${season}/${episode}`
            : `https://vixsrc.to/movie/${id}`;

      setActiveStreamUrl(fallbackUrl);
      setIsDirectVideo(false);
      setLoading(false);
    }
  }, [id, type, season, episode, isAnime, audioTrack, title, initialStreamUrl, initialHeaders, player, resetHideTimer]);

  useEffect(() => {
    resolveStream();
  }, [resolveStream]);

  useEffect(() => {
    saveToHistory({
      id,
      type,
      season: type === "tv" ? season : undefined,
      episode: type === "tv" || isAnime ? episode : undefined,
      title,
      poster_path,
    }).catch(() => {});
  }, [id, type, season, episode, isAnime, title, poster_path]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.container}>
      <StatusBar hidden style="light" />

      {activeStreamUrl && !loading && !error ? (
        <TouchableWithoutFeedback onPress={toggleControls}>
          <View style={styles.videoFrame}>
            {isDirectVideo ? (
              <VideoView
                player={player}
                style={styles.video}
                nativeControls={false}
                contentFit={contentFit}
                fullscreenOptions={{ enable: true }}
                allowsPictureInPicture
                surfaceType="surfaceView"
              />
            ) : (
              <WebView
                source={{
                  html: `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                        <style>
                          * { margin: 0; padding: 0; box-sizing: border-box; background: #000000; }
                          html, body { width: 100%; height: 100%; overflow: hidden; background: #000000; }
                          iframe { width: 100%; height: 100%; border: 0; position: absolute; top: 0; left: 0; }
                        </style>
                      </head>
                      <body>
                        <iframe
                          src="${activeStreamUrl}"
                          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                          allowfullscreen="true"
                          webkitallowfullscreen="true"
                          mozallowfullscreen="true"
                        ></iframe>
                      </body>
                    </html>
                  `,
                  baseUrl: isAnime ? "https://miruro.tv" : "https://vixsrc.to",
                }}
                style={styles.webview}
                originWhitelist={["*"]}
                allowsFullscreenVideo
                javaScriptEnabled
                domStorageEnabled
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback
                androidHardwareAccelerationDisabled={false}
                setSupportMultipleWindows={false}
                onShouldStartLoadWithRequest={(request) => {
                  return (
                    request.url.includes("vixsrc") ||
                    request.url.includes("vidsrc") ||
                    request.url.includes("miruro") ||
                    request.url.includes("megavid") ||
                    request.url.includes("anixo") ||
                    request.url.includes("autoembed") ||
                    request.url.includes("smashy") ||
                    request.url.includes("2embed") ||
                    request.url.includes("anime") ||
                    request.url.includes("m3u8") ||
                    request.url.includes("stream") ||
                    request.url.startsWith("about:") ||
                    request.url.startsWith("blob:")
                  );
                }}
              />
            )}

            {/* Custom Apple Liquid Glass Cinema HUD */}
            {controlsVisible && (
              <View style={styles.hudOverlay} pointerEvents="box-none">
                {/* Top Liquid Glass Island */}
                <View style={styles.topBar}>
                  <Pressable
                    accessibilityLabel="Go back"
                    hitSlop={12}
                    onPress={() => navigation.goBack()}
                    style={styles.glassCircleButton}
                  >
                    <ArrowLeft color="#FFFFFF" size={20} />
                  </Pressable>

                  <BlurView tint="dark" intensity={85} style={styles.titleGlassPill}>
                    <Text numberOfLines={1} style={styles.titleText}>
                      {title}
                    </Text>
                    {type === "tv" && (
                      <View style={styles.episodeTag}>
                        <Text style={styles.episodeTagText}>
                          S{season} E{episode}
                        </Text>
                      </View>
                    )}
                  </BlurView>

                  <View style={styles.topRightActions}>
                    <Pressable
                      accessibilityLabel="Toggle Fit"
                      hitSlop={8}
                      onPress={handleToggleFit}
                      style={styles.glassCircleButton}
                    >
                      {contentFit === "contain" ? (
                        <Maximize2 color="#FFFFFF" size={18} />
                      ) : (
                        <Minimize2 color="#FFFFFF" size={18} />
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* Center Cinema Controls for Direct Video */}
                {isDirectVideo && (
                  <View style={styles.centerControls} pointerEvents="box-none">
                    <Pressable
                      accessibilityLabel="Rewind 10 seconds"
                      hitSlop={12}
                      onPress={() => handleSeekBy(-10)}
                      style={styles.glassSeekButton}
                    >
                      <RotateCcw color="#FFFFFF" size={24} />
                      <Text style={styles.seekBadge}>10</Text>
                    </Pressable>

                    <Pressable
                      accessibilityLabel={isPlaying ? "Pause" : "Play"}
                      hitSlop={16}
                      onPress={handlePlayPause}
                      style={styles.heroPlayButton}
                    >
                      <BlurView tint="dark" intensity={95} style={styles.heroPlayBlur}>
                        {isPlaying ? (
                          <Pause color="#FFFFFF" size={32} />
                        ) : (
                          <Play color="#FFFFFF" size={32} style={{ marginLeft: 4 }} />
                        )}
                      </BlurView>
                    </Pressable>

                    <Pressable
                      accessibilityLabel="Forward 10 seconds"
                      hitSlop={12}
                      onPress={() => handleSeekBy(10)}
                      style={styles.glassSeekButton}
                    >
                      <RotateCw color="#FFFFFF" size={24} />
                      <Text style={styles.seekBadge}>10</Text>
                    </Pressable>
                  </View>
                )}

                {/* Bottom Liquid Glass Scrubber Dock */}
                {isDirectVideo && (
                  <View style={styles.bottomDockContainer}>
                    <BlurView tint="dark" intensity={88} style={styles.bottomGlassDock}>
                      <Pressable
                        accessibilityLabel="Mute toggle"
                        hitSlop={8}
                        onPress={handleToggleMute}
                        style={styles.dockIconButton}
                      >
                        {isMuted ? (
                          <VolumeX color="#FFFFFF" size={18} />
                        ) : (
                          <Volume2 color="#FFFFFF" size={18} />
                        )}
                      </Pressable>

                      <Text style={styles.timeLabel}>{formatTime(currentTime)}</Text>

                      {/* Progress Bar */}
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(Math.max(progressPercent, 0), 100)}%` },
                          ]}
                        />
                        <View style={styles.progressGlowHead} />
                      </View>

                      <Text style={styles.timeLabel}>
                        {duration > 0 ? formatTime(duration) : "--:--"}
                      </Text>

                      <View style={styles.oledQualityBadge}>
                        <Sparkles color="#FFFFFF" size={12} style={{ marginRight: 4 }} />
                        <Text style={styles.oledQualityText}>OLED</Text>
                      </View>
                    </BlurView>
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      ) : loading ? (
        <View style={styles.centerContainer}>
          <Pressable
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={() => navigation.goBack()}
            style={styles.backButtonTop}
          >
            <ArrowLeft color="#fff" size={20} />
          </Pressable>

          <BlurView tint="dark" intensity={88} style={styles.glassCard}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingTitle}>StreamGlass Cinema</Text>
            <Text style={styles.loadingSubtitle}>{title}</Text>
            {type === "tv" && (
              <View style={styles.episodePill}>
                <Text style={styles.episodePillText}>
                  Season {season} • Episode {episode}
                </Text>
              </View>
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
            <ArrowLeft color="#fff" size={20} />
          </Pressable>

          <BlurView tint="dark" intensity={88} style={styles.glassCard}>
            <AlertCircle color="#FF453A" size={42} style={{ marginBottom: 12 }} />
            <Text style={styles.errorTitle}>Stream Unavailable</Text>
            <Text style={styles.errorMessage}>{error}</Text>

            <Pressable
              style={styles.retryButton}
              onPress={resolveStream}
              android_ripple={{ color: "rgba(0,0,0,0.15)" }}
            >
              <RefreshCw color="#000000" size={18} style={{ marginRight: 8 }} />
              <Text style={styles.retryText}>Retry Playback</Text>
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
  video: { flex: 1, backgroundColor: "#000000" },
  webview: { flex: 1, backgroundColor: "#000000" },

  // HUD Overlay
  hudOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 16,
    zIndex: 999,
  },

  // Top Bar & Island
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 12,
  },
  glassCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  titleGlassPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    overflow: "hidden",
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  episodeTag: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 100,
    marginLeft: 8,
  },
  episodeTagText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Center Controls
  centerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 36,
  },
  glassSeekButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  seekBadge: {
    position: "absolute",
    bottom: 8,
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  heroPlayButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    overflow: "hidden",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroPlayBlur: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 38,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.28)",
  },

  // Bottom Liquid Glass Dock
  bottomDockContainer: {
    marginBottom: 8,
    alignItems: "center",
  },
  bottomGlassDock: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    overflow: "hidden",
    gap: 12,
  },
  dockIconButton: {
    padding: 4,
  },
  timeLabel: {
    color: "#8E8E93",
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    minWidth: 44,
    textAlign: "center",
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    overflow: "hidden",
    justifyContent: "center",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  progressGlowHead: {
    position: "absolute",
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  oledQualityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  oledQualityText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Loading & Error States
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#000000",
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
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    zIndex: 999,
  },
  glassCard: {
    width: "100%",
    maxWidth: 360,
    padding: 28,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
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
  episodePill: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 100,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  episodePillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
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
