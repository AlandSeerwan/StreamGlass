import AsyncStorage from "@react-native-async-storage/async-storage";

const HISTORY_KEY = "@streamglass_history";
const WATCHLIST_KEY = "@streamglass_watchlist";

async function readList(key) {
  try {
    const value = await AsyncStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeList(key, list) {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

export async function getHistory() {
  return readList(HISTORY_KEY);
}

export async function saveToHistory(item) {
  const history = await readList(HISTORY_KEY);
  const nextItem = { ...item, updatedAt: Date.now() };
  const nextHistory = [
    nextItem,
    ...history.filter(
      (historyItem) =>
        !(historyItem.id === item.id && historyItem.type === item.type),
    ),
  ].slice(0, 20);
  await writeList(HISTORY_KEY, nextHistory);
  return nextHistory;
}

export async function getWatchlist() {
  return readList(WATCHLIST_KEY);
}

export async function toggleWatchlist(item) {
  const watchlist = await readList(WATCHLIST_KEY);
  const exists = watchlist.some(
    (watchlistItem) =>
      watchlistItem.id === item.id && watchlistItem.type === item.type,
  );
  const nextWatchlist = exists
    ? watchlist.filter(
        (watchlistItem) =>
          !(watchlistItem.id === item.id && watchlistItem.type === item.type),
      )
    : [item, ...watchlist];
  await writeList(WATCHLIST_KEY, nextWatchlist);
  return { exists: !exists, items: nextWatchlist };
}

export async function checkIsInWatchlist(id, type) {
  const watchlist = await readList(WATCHLIST_KEY);
  return watchlist.some(
    (watchlistItem) => watchlistItem.id === id && watchlistItem.type === type,
  );
}
