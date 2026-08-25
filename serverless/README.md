# VidSrc Serverless Extractor

Deploy this serverless extractor to **Vercel** with one click or run locally with Node.js to provide direct HLS (`.m3u8`) stream URLs for StreamGlass's native `expo-video` player.

---

## 1-Click Deployment (Vercel)

1. Push this folder or fork the repository to GitHub.
2. In Vercel, import the repository and set Root Directory to `serverless/` (or deploy from repository root).
3. Once deployed, copy your Vercel URL (e.g., `https://your-stream-extractor.vercel.app`).
4. Set your custom URL in StreamGlass via `services/extractor.js` or in the app settings.

---

## Supported Endpoints

### 1. Movie Stream Extraction
```http
GET /api/vidsrc?id={tmdb_id}&type=movie
GET /movie/{tmdb_id}
GET /vidsrc/{tmdb_id}
```

### 2. TV Show Episode Stream Extraction
```http
GET /api/vidsrc?id={tmdb_id}&type=tv&season={season}&episode={episode}
GET /tv/{tmdb_id}/{season}/{episode}
GET /vidsrc/{tmdb_id}/{season}/{episode}
```

### 3. Response Format
```json
{
  "sources": [
    {
      "url": "https://stream-provider-cdn.com/hls/master.m3u8",
      "quality": "1080p",
      "isM3U8": true
    }
  ],
  "headers": {
    "Referer": "https://vidsrc.to/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
  },
  "subtitles": [
    {
      "lang": "English",
      "url": "https://.../subtitles/en.vtt"
    }
  ]
}
```
