const API_KEY = "91d2de6d26bc957e08d1f9c41f505840";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function request(path) {
  const response = await fetch(
    `${TMDB_BASE_URL}${path}${path.includes("?") ? "&" : "?"}api_key=${API_KEY}`,
  );
  if (!response.ok) {
    throw new Error(`TMDB request failed with status ${response.status}`);
  }
  return response.json();
}

export async function getTrending() {
  const data = await request("/trending/all/week");
  return Array.isArray(data.results) ? data.results : [];
}

export async function getTopRatedMovies() {
  const data = await request("/movie/top_rated");
  return Array.isArray(data.results)
    ? data.results.map((item) => ({ ...item, media_type: "movie" }))
    : [];
}

export async function getTrendingSeries() {
  const data = await request("/trending/tv/week");
  return Array.isArray(data.results)
    ? data.results.map((item) => ({ ...item, media_type: "tv" }))
    : [];
}

export async function getTopRatedSeries() {
  const data = await request("/tv/top_rated");
  return Array.isArray(data.results)
    ? data.results.map((item) => ({ ...item, media_type: "tv" }))
    : [];
}

export async function searchMedia(query) {
  if (!query.trim()) return [];
  const data = await request(
    `/search/multi?query=${encodeURIComponent(query)}`,
  );
  return Array.isArray(data.results)
    ? data.results.filter(
        (item) => item.media_type === "movie" || item.media_type === "tv",
      )
    : [];
}

export async function getDetails(id, type) {
  return request(`/${type}/${id}?append_to_response=credits,similar`);
}

export async function getSeason(id, seasonNumber) {
  return request(`/tv/${id}/season/${seasonNumber}`);
}

export { extractStream, getExtractorBaseUrl, setExtractorBaseUrl } from "./extractor";

