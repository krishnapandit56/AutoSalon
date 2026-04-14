// Global analytics cache — prevents repeated API calls on every page visit
// Stores fetched data in memory for the session lifetime

let analyticsCache = null;
let bookingsCache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchAnalytics(token) {
  const now = Date.now();
  if (analyticsCache && now - cacheTime < CACHE_TTL) return analyticsCache;

  const res = await fetch('http://localhost:5000/api/mongo-analytics', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Analytics fetch failed: ${res.status}`);
  analyticsCache = await res.json();
  cacheTime = now;
  return analyticsCache;
}

export async function fetchBookings(token) {
  const now = Date.now();
  if (bookingsCache && now - cacheTime < CACHE_TTL) return bookingsCache;

  const res = await fetch('http://localhost:5000/api/bookings', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  bookingsCache = await res.json();
  return bookingsCache;
}

export function invalidateCache() {
  analyticsCache = null;
  bookingsCache = null;
  cacheTime = 0;
}
