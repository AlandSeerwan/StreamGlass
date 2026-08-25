const API_KEY = "91d2de6d26bc957e08d1f9c41f505840";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";

export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function getImageUrl(path, size = "w780") {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${TMDB_IMAGE_BASE}/${size}${path.startsWith("/") ? "" : "/"}${path}`;
}

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

export async function getPopularMovies(page = 1) {
  const data = await request(`/movie/popular?page=${page}`);
  return Array.isArray(data.results)
    ? data.results.map((item) => ({ ...item, media_type: "movie" }))
    : [];
}

export async function getTopRatedMovies() {
  const data = await request("/movie/top_rated");
  return Array.isArray(data.results)
    ? data.results.map((item) => ({ ...item, media_type: "movie" }))
    : [];
}

export async function getMoviesByGenre(genreId, page = 1) {
  const data = await request(
    `/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&page=${page}`
  );
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

export async function getPopularSeries(page = 1) {
  const data = await request(`/tv/popular?page=${page}`);
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

export async function getSeriesByGenre(genreId, page = 1) {
  const data = await request(
    `/discover/tv?with_genres=${genreId}&sort_by=popularity.desc&page=${page}`
  );
  return Array.isArray(data.results)
    ? data.results.map((item) => ({ ...item, media_type: "tv" }))
    : [];
}

export async function searchMedia(query) {
  if (!query || !query.trim()) return [];
  const data = await request(
    `/search/multi?query=${encodeURIComponent(query.trim())}`
  );
  return Array.isArray(data.results)
    ? data.results.filter(
        (item) => item.media_type === "movie" || item.media_type === "tv"
      )
    : [];
}

export async function getDetails(id, type) {
  return request(`/${type}/${id}?append_to_response=credits,similar,recommendations`);
}

export async function getSeason(id, seasonNumber) {
  return request(`/tv/${id}/season/${seasonNumber}`);
}

/**
 * Fetch Trending Anime from AniList GraphQL
 */
export async function getTrendingAnime(page = 1, perPage = 20) {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            extraLarge
            large
          }
          bannerImage
          description
          episodes
          averageScore
          genres
          seasonYear
        }
      }
    }
  `;

  try {
    const res = await fetch(ANILIST_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { page, perPage },
      }),
    });

    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.Page?.media || [];
  } catch {
    return [];
  }
}

export { extractStream, getExtractorBaseUrl, setExtractorBaseUrl } from "./extractor";
