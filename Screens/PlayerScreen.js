import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
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
  Lock,
  Unlock,
} from "lucide-react-native";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { saveToHistory } from "../services/storage";
import { extractStream } from "../services/extractor";

const NETFLIX_RED = "#E50914";
const HUD_BG = "rgba(0, 0, 0, 0.55)";
const HIDE_DELAY = 4000;

const INJECTED_AD_BLOCKER = `
  (function() {
    try {
      window.open = function() { return null; };
      const style = document.createElement('style');
      style.innerHTML = \`
        iframe[src*="ad"], iframe[src*="pop"], iframe[src*="click"], iframe[src*="bet"],
        .ad-container, .ad-box, .popunder, #disqus_thread, div[class*="ad-"], div[id*="ad-"],
        div[class*="popup"], div[id*="popup"], .vignette-ad, .ad-banner {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }
      \`;
      document.head.appendChild(style);
    } catch(e) {}
  })();
  true;
`;

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

  // Stream state
  const [activeStreamUrl, setActiveStreamUrl] = useState(initialStreamUrl || null);
  const [activeHeaders, setActiveHeaders] = useState(initialHeaders || null);
  const [isDirectVideo, setIsDirectVideo] = useState(
    initialStreamUrl ? /\.(m3u8|mp4|webm)(\?.*)?$/i.test(initialStreamUrl) : false
  );
  const [loading, setLoading] = useState(!initialStreamUrl);
  const [statusMessage, setStatusMessage] = useState(
    initialStreamUrl ? "Starting playback..." : "Connecting to stream..."
  );
  const [error, setError] = useState(null);

  // HUD state
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [contentFit, setContentFit] = useState("contain");
  const [controlsLocked, setControlsLocked] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  const hideControlsTimer = useRef(null);
  const progressBarRef = useRef(null);
  const progressBarWidth = useRef(0);

  // ─── Landscape Lock ──────────────────────────────────────
  useEffect(() => {
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE
    ).catch(() => {});

    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(() => {});
    };
  }, []);

  // ─── Video Player ────────────────────────────────────────
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

  // ─── HUD Auto-hide ──────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    setControlsVisible(true);
    hideControlsTimer.current = setTimeout(() => {
      if (!controlsLocked) {
        setControlsVisible(false);
      }
    }, HIDE_DELAY);
  }, [controlsLocked]);

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, []);

  const toggleControls = () => {
    if (controlsLocked) return;
    if (controlsVisible) {
      setControlsVisible(false);
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    } else {
      resetHideTimer();
    }
  };

  // ─── Time Formatting ────────────────────────────────────
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ─── Player Controls ───────────────────────────────────
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

  const handleToggleLock = () => {
    const nextLocked = !controlsLocked;
    setControlsLocked(nextLocked);
    if (nextLocked) {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      setControlsVisible(true);
    } else {
      resetHideTimer();
    }
  };

  // ─── Time Tracking ─────────────────────────────────────
  useEffect(() => {
    if (!player || !isDirectVideo) return;

    const interval = setInterval(() => {
      if (!isScrubbing) {
        if (typeof player.currentTime === "number") {
          setCurrentTime(player.currentTime);
        }
      }
      if (typeof player.duration === "number" && player.duration > 0) {
        setDuration(player.duration);
      }
      if (typeof player.playing === "boolean") {
        setIsPlaying(player.playing);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [player, isDirectVideo, isScrubbing]);

  // ─── Scrubber PanResponder ─────────────────────────────
  const scrubberPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsScrubbing(true);
        if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
        const locationX = evt.nativeEvent.locationX;
        const barW = progressBarWidth.current || 1;
        const ratio = Math.max(0, Math.min(locationX / barW, 1));
        setScrubTime(ratio * duration);
      },
      onPanResponderMove: (evt, gestureState) => {
        const barW = progressBarWidth.current || 1;
        const startX = evt.nativeEvent.locationX - gestureState.dx;
        const currentX = startX + gestureState.dx;
        const ratio = Math.max(0, Math.min(currentX / barW, 1));
        setScrubTime(ratio * duration);
      },
      onPanResponderRelease: () => {
        setIsScrubbing(false);
        if (player && typeof scrubTime === "number") {
          if (typeof player.currentTime === "number") {
            player.currentTime = scrubTime;
          }
          setCurrentTime(scrubTime);
        }
        resetHideTimer();
      },
    })
  ).current;

  // ─── Stream Resolution ─────────────────────────────────
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
    setStatusMessage("Finding best stream for " + title + "...");

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
          isAnime
            ? `https://megavid.buzz/ani/${id}/${episode || 1}/${audioTrack || "sub"}?autoplay=true`
            : type === "tv"
              ? `https://vixsrc.to/tv/${id}/${season}/${episode}`
              : `https://vixsrc.to/movie/${id}`;

        setActiveStreamUrl(fallbackUrl);
        setIsDirectVideo(false);
        setLoading(false);
      }
    } catch {
      const fallbackUrl =
        isAnime
          ? `https://megavid.buzz/ani/${id}/${episode || 1}/${audioTrack || "sub"}?autoplay=true`
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

  // ─── Computed Values ───────────────────────────────────
  const displayTime = isScrubbing ? scrubTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  const episodeLabel =
    isAnime
      ? `E${episode}`
      : type === "tv"
        ? `S${season}:E${episode}`
        : null;

  // ─── Render ────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar hidden style="light" />

      {activeStreamUrl && !loading && !error ? (
        <View style={styles.videoFrame}>
          {isDirectVideo ? (
            <VideoView
              player={player}
              style={styles.video}
              nativeControls={false}
              contentFit={contentFit}
              allowsPictureInPicture
              surfaceType="textureView"
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
                        * { margin: 0; padding: 0; box-sizing: border-box; background: #000; }
                        html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
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
              injectedJavaScriptBeforeContentLoaded={INJECTED_AD_BLOCKER}
              injectedJavaScript={INJECTED_AD_BLOCKER}
              onShouldStartLoadWithRequest={(request) => {
                const url = request.url.toLowerCase();
                if (
                  url.includes("adsterra") ||
                  url.includes("popcash") ||
                  url.includes("onclick") ||
                  url.includes("bet") ||
                  url.includes("casino") ||
                  url.includes("doubleclick") ||
                  url.includes("syndication") ||
                  url.includes("exoclick") ||
                  url.includes("juicyads") ||
                  url.includes("trafficjunky") ||
                  url.includes("redirect")
                ) {
                  return false;
                }
                return (
                  url.includes("vixsrc") ||
                  url.includes("vidsrc") ||
                  url.includes("miruro") ||
                  url.includes("megavid") ||
                  url.includes("anixo") ||
                  url.includes("autoembed") ||
                  url.includes("smashy") ||
                  url.includes("2embed") ||
                  url.includes("anime") ||
                  url.includes("m3u8") ||
                  url.includes("stream") ||
                  url.startsWith("about:") ||
                  url.startsWith("blob:")
                );
              }}
            />
          )}

          {/* Fullscreen Touch Interceptor Overlay */}
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={toggleControls}
          />

          {/* ═══ Netflix HUD Overlay ═══ */}
          <View
            style={[styles.hudOverlay, { opacity: controlsVisible ? 1 : 0 }]}
            pointerEvents={controlsVisible ? "box-none" : "none"}
          >

                {/* ── Top Bar ── */}
                <View style={styles.topBar}>
                  <Pressable
                    accessibilityLabel="Go back"
                    hitSlop={14}
                    onPress={() => navigation.goBack()}
                    style={styles.topBarBtn}
                  >
                    <ArrowLeft color="#FFFFFF" size={22} />
                  </Pressable>

                  <View style={styles.titleContainer}>
                    <Text numberOfLines={1} style={styles.titleText}>
                      {title}
                    </Text>
                    {episodeLabel && (
                      <Text style={styles.episodeLabel}> · {episodeLabel}</Text>
                    )}
                  </View>

                  <View style={styles.topBarRight}>
                    {isDirectVideo && (
                      <Pressable
                        accessibilityLabel="Toggle mute"
                        hitSlop={10}
                        onPress={handleToggleMute}
                        style={styles.topBarBtn}
                      >
                        {isMuted ? (
                          <VolumeX color="#FFFFFF" size={20} />
                        ) : (
                          <Volume2 color="#FFFFFF" size={20} />
                        )}
                      </Pressable>
                    )}
                    {isDirectVideo && (
                      <Pressable
                        accessibilityLabel="Toggle aspect"
                        hitSlop={10}
                        onPress={handleToggleFit}
                        style={styles.topBarBtn}
                      >
                        {contentFit === "contain" ? (
                          <Maximize2 color="#FFFFFF" size={20} />
                        ) : (
                          <Minimize2 color="#FFFFFF" size={20} />
                        )}
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* ── Center Play Controls (direct video only) ── */}
                {isDirectVideo && (
                  <View style={styles.centerControls} pointerEvents="box-none">
                    <Pressable
                      accessibilityLabel="Rewind 10 seconds"
                      hitSlop={16}
                      onPress={() => handleSeekBy(-10)}
                      style={({ pressed }) => [
                        styles.seekButton,
                        pressed && styles.seekButtonPressed,
                      ]}
                    >
                      <RotateCcw color="#FFFFFF" size={28} />
                      <Text style={styles.seekLabel}>10</Text>
                    </Pressable>

                    <Pressable
                      accessibilityLabel={isPlaying ? "Pause" : "Play"}
                      hitSlop={20}
                      onPress={handlePlayPause}
                      style={({ pressed }) => [
                        styles.playPauseButton,
                        pressed && styles.playPausePressed,
                      ]}
                    >
                      {isPlaying ? (
                        <Pause color="#FFFFFF" size={36} fill="#FFFFFF" />
                      ) : (
                        <Play color="#FFFFFF" size={36} fill="#FFFFFF" style={{ marginLeft: 3 }} />
                      )}
                    </Pressable>

                    <Pressable
                      accessibilityLabel="Forward 10 seconds"
                      hitSlop={16}
                      onPress={() => handleSeekBy(10)}
                      style={({ pressed }) => [
                        styles.seekButton,
                        pressed && styles.seekButtonPressed,
                      ]}
                    >
                      <RotateCw color="#FFFFFF" size={28} />
                      <Text style={styles.seekLabel}>10</Text>
                    </Pressable>
                  </View>
                )}

                {/* ── Bottom: Scrubber + Utility Row (direct video only) ── */}
                {isDirectVideo && (
                  <View style={styles.bottomSection}>
                    {/* Progress / Scrubber */}
                    <View style={styles.progressRow}>
                      <Text style={styles.timeText}>{formatTime(displayTime)}</Text>

                      <View
                        style={styles.progressBarContainer}
                        onLayout={(e) => {
                          progressBarWidth.current = e.nativeEvent.layout.width;
                        }}
                        {...scrubberPanResponder.panHandlers}
                      >
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${Math.min(Math.max(progressPercent, 0), 100)}%` },
                            ]}
                          />
                        </View>
                        {/* Scrub Thumb */}
                        <View
                          style={[
                            styles.scrubThumb,
                            {
                              left: `${Math.min(Math.max(progressPercent, 0), 100)}%`,
                            },
                          ]}
                        />
                      </View>

                      <Text style={styles.timeText}>
                        {duration > 0 ? formatTime(duration) : "--:--"}
                      </Text>
                    </View>

                    {/* Utility Row */}
                    <View style={styles.utilityRow}>
                      <Pressable
                        accessibilityLabel="Lock controls"
                        hitSlop={10}
                        onPress={handleToggleLock}
                        style={styles.utilityBtn}
                      >
                        {controlsLocked ? (
                          <Lock color="#FFFFFF" size={18} />
                        ) : (
                          <Unlock color="#8E8E93" size={18} />
                        )}
                        <Text style={[styles.utilityLabel, controlsLocked && { color: "#FFFFFF" }]}>
                          {controlsLocked ? "Locked" : "Lock"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Embed-only: just back button in top bar */}
                {!isDirectVideo && (
                  <View style={{ flex: 1 }} />
                )}
              </View>
          </View>
        ) : loading ? (
        /* ── Loading State ── */
        <View style={styles.stateContainer}>
          <Pressable
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={() => navigation.goBack()}
            style={styles.stateBackBtn}
          >
            <ArrowLeft color="#FFFFFF" size={20} />
          </Pressable>

          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color={NETFLIX_RED} />
            <Text style={styles.stateTitle}>{title}</Text>
            {episodeLabel && (
              <Text style={styles.stateEpisode}>{episodeLabel}</Text>
            )}
            <Text style={styles.stateMessage}>{statusMessage}</Text>
          </View>
        </View>
      ) : (
        /* ── Error State ── */
        <View style={styles.stateContainer}>
          <Pressable
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={() => navigation.goBack()}
            style={styles.stateBackBtn}
          >
            <ArrowLeft color="#FFFFFF" size={20} />
          </Pressable>

          <View style={styles.stateCard}>
            <AlertCircle color={NETFLIX_RED} size={48} style={{ marginBottom: 16 }} />
            <Text style={styles.stateTitle}>Stream Unavailable</Text>
            <Text style={styles.stateMessage}>{error || "Could not connect to the stream provider."}</Text>

            <Pressable
              style={styles.retryButton}
              onPress={resolveStream}
            >
              <RefreshCw color="#FFFFFF" size={16} style={{ marginRight: 8 }} />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// Netflix-Style Stylesheet
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  videoFrame: { flex: 1, backgroundColor: "#000000" },
  video: { flex: 1, backgroundColor: "#000000" },
  webview: { flex: 1, backgroundColor: "#000000" },

  // ── HUD Overlay ──
  hudOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: HUD_BG,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    zIndex: 999,
  },

  // ── Top Bar ──
  topBar: {
    flexDirection: "row",
    alignItems: "center",
  },
  topBarBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    flexShrink: 1,
  },
  episodeLabel: {
    color: "#8E8E93",
    fontSize: 15,
    fontWeight: "600",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
  },

  // ── Center Controls ──
  centerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 48,
  },
  seekButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.9,
  },
  seekButtonPressed: {
    opacity: 0.5,
  },
  seekLabel: {
    position: "absolute",
    bottom: 6,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  playPauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  playPausePressed: {
    opacity: 0.6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },

  // ── Bottom Section ──
  bottomSection: {
    gap: 8,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    minWidth: 48,
  },
  progressBarContainer: {
    flex: 1,
    height: 36,
    justifyContent: "center",
    position: "relative",
  },
  progressTrack: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: NETFLIX_RED,
    borderRadius: 2,
  },
  scrubThumb: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: NETFLIX_RED,
    marginLeft: -7,
    top: 11,
    shadowColor: NETFLIX_RED,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },

  // ── Utility Row ──
  utilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingLeft: 4,
  },
  utilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  utilityLabel: {
    color: "#8E8E93",
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Loading & Error States ──
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#000000",
  },
  stateBackBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    zIndex: 999,
  },
  stateCard: {
    width: "100%",
    maxWidth: 380,
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  stateTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  stateEpisode: {
    color: "#8E8E93",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  stateMessage: {
    color: "#8E8E93",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NETFLIX_RED,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 6,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
