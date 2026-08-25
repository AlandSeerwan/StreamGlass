/**
 * StreamGlass Serverless Extractor API
 * Resolves TMDB movie/TV IDs into direct HLS (.m3u8) video streams.
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const { id, type = "movie", season = "1", episode = "1" } = req.query;

  if (!id) {
    return res.status(400).json({
      error: "Missing required 'id' parameter (TMDB ID). Example: /api/vidsrc?id=1011985&type=movie",
    });
  }

  try {
    if (type === "anime") {
      return res.status(200).json({
        provider: "autoembed-anime",
        sources: [
          {
            url: `https://autoembed.cc/embed/anime/${id}/${episode}`,
            quality: "auto",
            isM3U8: false,
          },
        ],
        headers: {
          Referer: "https://autoembed.cc/",
        },
        subtitles: [],
      });
    }

    const providers = [
      {
        name: "vixsrc",
        base: "https://vixsrc.to",
        moviePath: `/movie/${id}`,
        tvPath: `/tv/${id}/${season}/${episode}`,
      },
      {
        name: "vidsrc",
        base: "https://vidsrc.to/embed",
        moviePath: `/movie/${id}`,
        tvPath: `/tv/${id}/${season}/${episode}`,
      },
    ];

    for (const provider of providers) {
      try {
        const path = type === "tv" ? provider.tvPath : provider.moviePath;
        const embedUrl = `${provider.base}${path}`;

        const pageResponse = await fetch(embedUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Referer: provider.base,
          },
        });

        if (!pageResponse.ok) continue;

        const html = await pageResponse.text();
        const srcMatch = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);

        if (srcMatch && srcMatch[0]) {
          return res.status(200).json({
            provider: provider.name,
            sources: [
              {
                url: srcMatch[0],
                quality: "1080p",
                isM3U8: true,
              },
            ],
            headers: {
              Referer: provider.base,
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            subtitles: [],
          });
        }
      } catch {
        // try next provider
      }
    }

    // Fallback response structure
    return res.status(200).json({
      sources: [
        {
          url: `https://vixsrc.to/${type === "tv" ? `tv/${id}/${season}/${episode}` : `movie/${id}`}`,
          quality: "auto",
          isM3U8: false,
        },
      ],
      headers: {
        Referer: "https://vixsrc.to/",
      },
      subtitles: [],
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to extract stream from provider.",
    });
  }
}
