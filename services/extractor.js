import AsyncStorage from "@react-native-async-storage/async-storage";

const EXTRACTOR_STORAGE_KEY = "@streamglass_custom_extractor_url";

// Default serverless instances for vidsrc / vixsrc stream extraction
export const DEFAULT_EXTRACTOR_ENDPOINTS = [
  "https://stream-glass.vercel.app",
  "https://vidsrc-api.vercel.app",
  "https://vidsrc-new.vercel.app",
];

export const MIRURO_API_BASE = "https://miruro-api-beta.vercel.app";

/**
 * Get current configured extractor endpoint (or fallback to defaults)
 */
export async function getExtractorBaseUrl() {
  try {
    const customUrl = await AsyncStorage.getItem(EXTRACTOR_STORAGE_KEY);
    if (customUrl && customUrl.trim()) {
      return customUrl.trim().replace(/\/+$/, "");
    }
  } catch {
    // fallback
  }
  return DEFAULT_EXTRACTOR_ENDPOINTS[0];
}

/**
 * Update custom extractor endpoint URL
 */
export async function setExtractorBaseUrl(url) {
  if (url && url.trim()) {
    await AsyncStorage.setItem(EXTRACTOR_STORAGE_KEY, url.trim().replace(/\/+$/, ""));
  } else {
    await AsyncStorage.removeItem(EXTRACTOR_STORAGE_KEY);
  }
}

/**
 * Parse and normalize different vidsrc-api / vidsrc-new JSON formats
 */
function normalizeExtractorResponse(data) {
  if (!data) return null;

  let streamUrl = null;
  let headers = {};
  let subtitles = [];
  let quality = "auto";

  // Format 1: { sources: [ { url: "...", isM3U8: true, quality: "1080p" } ], headers: {...}, subtitles: [...] }
  if (Array.isArray(data.sources) && data.sources.length > 0) {
    const firstSource = data.sources.find((s) => s.url || s.file || s.stream) || data.sources[0];
    streamUrl = firstSource.url || firstSource.file || firstSource.stream || (typeof firstSource === "string" ? firstSource : null);
    if (firstSource.quality) quality = firstSource.quality;
  }
  // Format 2: { status: 200, sources: [ { name: "vidsrc", data: { stream: "...", subtitle: [...] } } ] }
  else if (Array.isArray(data.sources) && data.sources[0]?.data?.stream) {
    streamUrl = data.sources[0].data.stream;
    if (Array.isArray(data.sources[0].data.subtitle)) {
      subtitles = data.sources[0].data.subtitle.map((sub) => ({
        lang: sub.lang || sub.label || "Unknown",
        url: sub.file || sub.url,
      }));
    }
  }
  // Format 3: { stream: "...", url: "..." }
  else if (data.stream || data.url || data.streamUrl || data.source) {
    streamUrl = data.stream || data.url || data.streamUrl || data.source;
  }

  // Extract headers if provided
  if (data.headers && typeof data.headers === "object") {
    headers = data.headers;
  } else if (!headers.Referer) {
    headers = {
      Referer: "https://vidsrc.to/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };
  }

  // Extract subtitles if present
  if (Array.isArray(data.subtitles)) {
    subtitles = data.subtitles.map((sub) => ({
      lang: sub.lang || sub.label || sub.language || "Unknown",
      url: sub.url || sub.file || sub.src,
    }));
  }

  const isM3U8 =
    Boolean(data.sources?.[0]?.isM3U8) ||
    /\.(m3u8|mp4|webm)(\?.*)?$/i.test(streamUrl);

  return {
    streamUrl,
    isM3U8,
    headers,
    subtitles,
    quality,
  };
}

/**
 * Extract Anime stream from Miruro API (AniList ID + Episode + Sub/Dub)
 */
export async function extractAnimeStream({ id, episode = 1, audioTrack = "sub" }) {
  const lang = audioTrack === "dub" ? "dub" : "sub";
  const targetUrl = `${MIRURO_API_BASE}/api/embed/${id}/${episode}?lang=${lang}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
      const providers = json?.results?.providers || [];

      if (providers.length > 0) {
        // Prefer megavid or anixo
        const primary =
          providers.find((p) => p.id === "megavid") ||
          providers.find((p) => p.id === "anixo") ||
          providers[0];

        if (primary && primary.url) {
          return {
            streamUrl: primary.url,
            isM3U8: false,
            providerName: primary.name,
            headers: {
              Referer: "https://miruro.tv/",
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          };
        }
      }
    }
  } catch {
    // fallback below
  }

  // Fallback to direct megavid/autoembed schema
  return {
    streamUrl: `https://megavid.buzz/ani/${id}/${episode}/${lang}?autoplay=true`,
    isM3U8: false,
    providerName: "Megavid",
    headers: {
      Referer: "https://megavid.buzz/",
    },
  };
}

/**
 * Extract direct HLS / MP4 stream link from a vidsrc-api / vixsrc instance
 */
export async function extractStream({ id, type = "movie", season = 1, episode = 1, audioTrack = "sub" }) {
  if (type === "anime") {
    return extractAnimeStream({ id, episode, audioTrack });
  }

  const customBaseUrl = await getExtractorBaseUrl();
  const endpointsToTry = [
    customBaseUrl,
    ...DEFAULT_EXTRACTOR_ENDPOINTS.filter((u) => u !== customBaseUrl),
  ];

  let lastError = null;

  for (const baseUrl of endpointsToTry) {
    const pathVariants =
      type === "tv"
        ? [
            `/vidsrc/${id}/${season}/${episode}`,
            `/tv/${id}/${season}/${episode}`,
            `/api/vidsrc?id=${id}&type=tv&season=${season}&episode=${episode}`,
          ]
        : [
            `/vidsrc/${id}`,
            `/movie/${id}`,
            `/api/vidsrc?id=${id}&type=movie`,
          ];

    for (const path of pathVariants) {
      try {
        const targetUrl = `${baseUrl}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          const parsed = normalizeExtractorResponse(json);
          if (parsed && parsed.streamUrl) {
            return parsed;
          }
        }
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw new Error(
    lastError?.message ||
      `Failed to extract stream for ID ${id}. Ensure extractor is running.`
  );
}
