/**
 * Shared Client-Side User & Plan Data Service
 *
 * Provides:
 * 1. In-flight request deduplication: Multiple components mounting concurrently
 *    (e.g., Topbar, useFertilizerPlanner, AppShell) share a single HTTP request to /api/user.
 * 2. In-memory caching: Prevents redundant fetches on re-renders, route changes, or StrictMode mounts.
 * 3. Cache invalidation: Called on profile update, plan save/deletion, or logout.
 */

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  isactive?: boolean;
  theme?: string;
  language?: string;
  state?: string;
  district?: string;
  city?: string;
  address?: string;
  avatar_url?: string;
  phone_nun?: string;
  phone_number?: string;
  createdAt?: string;
}

export interface UserApiResponse {
  success: boolean;
  user?: UserProfile;
  plans?: any[];
  error?: string;
}

let inFlightPromise: Promise<UserApiResponse | null> | null = null;
let cachedData: UserApiResponse | null = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 60000; // 1 minute fresh cache

export async function fetchUserData(options?: { force?: boolean }): Promise<UserApiResponse | null> {
  if (typeof window === 'undefined') return null;

  const now = Date.now();
  if (!options?.force && cachedData && now - lastFetchTimestamp < CACHE_TTL_MS) {
    return cachedData;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      const res = await fetch('/api/user', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        if (res.status === 401) {
          cachedData = null;
        }
        return null;
      }
      const data: UserApiResponse = await res.json();
      if (data && data.success) {
        cachedData = data;
        lastFetchTimestamp = Date.now();
        if (data.user) {
          try {
            localStorage.setItem('farmhub_user', JSON.stringify(data.user));
          } catch {}
        }
      }
      return data;
    } catch (err) {
      console.warn('[UserDataService] Failed to fetch /api/user:', err);
      return null;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

export function invalidateUserDataCache(): void {
  cachedData = null;
  lastFetchTimestamp = 0;
  inFlightPromise = null;
}

export function updateCachedUserData(updater: (prev: UserApiResponse | null) => UserApiResponse | null): void {
  cachedData = updater(cachedData);
  lastFetchTimestamp = Date.now();
}
