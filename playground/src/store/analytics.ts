import { map } from "nanostores";
import { ANALYTICS_CACHE_TTL, EPINETS_CACHE_TTL, MAX_ANALYTICS_HOURS } from "@/constants";
import type { LeadMetrics, StoryfragmentAnalytics } from "@/types";

const VERBOSE = false;

export function formatHourKey(date: Date): string {
  // Use UTC to match database timestamps
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  return `${year}-${month}-${day}-${hour}`;
}

export interface HourlyContentData {
  uniqueVisitors: Set<string>;
  knownVisitors: Set<string>;
  anonymousVisitors: Set<string>;
  actions: number;
  eventCounts: Record<string, number>;
}

export interface HourlySiteData {
  totalVisits: number;
  knownVisitors: Set<string>;
  anonymousVisitors: Set<string>;
  eventCounts: Record<string, number>;
}

export interface HourlyEpinetStepData {
  visitors: Set<string>;
  name: string;
  stepIndex: number;
}

export interface HourlyEpinetTransitionData {
  visitors: Set<string>;
}

export interface HourlyEpinetData {
  steps: Record<string, HourlyEpinetStepData>;
  transitions: Record<string, Record<string, HourlyEpinetTransitionData>>;
}

export const hourlyAnalyticsStore = map<{
  data: Record<
    string,
    {
      contentData: Record<string, Record<string, HourlyContentData>>;
      siteData: Record<string, HourlySiteData>;
      lastFullHour: string;
      lastUpdated: number;
      totalLeads: number;
      lastActivity: string | null;
      slugMap: Map<string, string>;
    }
  >;
}>({
  data: {},
});

export const hourlyEpinetStore = map<{
  data: Record<string, Record<string, Record<string, HourlyEpinetData>>>;
  lastFullHour: Record<string, string>;
  lastUpdateTime: Record<string, number>;
}>({
  data: {},
  lastFullHour: {},
  lastUpdateTime: {},
});

export function isAnalyticsCacheValid(tenantId: string = "default"): boolean {
  const store = hourlyAnalyticsStore.get();
  const tenantData = store.data[tenantId] || {
    contentData: {},
    siteData: {},
    lastFullHour: "",
    lastUpdated: 0,
    totalLeads: 0,
    lastActivity: null,
    slugMap: new Map(),
  };

  // Check if we have basic data structure
  if (!tenantData.lastFullHour || Object.keys(tenantData.contentData).length === 0) {
    if (VERBOSE)
      console.log("Lead metrics cache invalid: missing lastFullHour or contentData for tenant", {
        tenantId,
      });
    return false;
  }

  // Check if the current hour data needs refreshing
  const currentHour = formatHourKey(new Date(Date.now()));
  const timeSinceUpdate = Date.now() - tenantData.lastUpdated;

  // Return false (invalid) if either TTL is exceeded or the hour has changed
  if (timeSinceUpdate >= ANALYTICS_CACHE_TTL || tenantData.lastFullHour !== currentHour) {
    if (VERBOSE)
      console.log("Lead metrics cache requires current hour refresh", {
        lastFullHour: tenantData.lastFullHour,
        currentHour,
        timeSinceUpdate,
      });
    return false;
  }

  return true;
}

export function isEpinetCacheValid(tenantId: string = "default"): boolean {
  const store = hourlyEpinetStore.get();

  if (
    !store.lastFullHour[tenantId] ||
    !store.lastUpdateTime[tenantId] ||
    Object.keys(store.data[tenantId] || {}).length === 0
  ) {
    if (VERBOSE)
      console.log(
        "Epinet cache invalid: missing lastFullHour, lastUpdateTime, or data for tenant",
        {
          tenantId,
        }
      );
    return false;
  }

  const lastHourKey = store.lastFullHour[tenantId];
  const lastUpdateTime = store.lastUpdateTime[tenantId];
  const currentHour = formatHourKey(new Date(Date.now()));

  // Return false (invalid) if either TTL is exceeded or the hour has changed
  if (lastHourKey !== currentHour || Date.now() - lastUpdateTime >= EPINETS_CACHE_TTL) {
    if (VERBOSE)
      console.log("Epinet cache requires current hour refresh", { lastHourKey, currentHour });
    return false;
  }

  return true;
}

export function createEmptyHourlyContentData(): HourlyContentData {
  return {
    uniqueVisitors: new Set<string>(),
    knownVisitors: new Set<string>(),
    anonymousVisitors: new Set<string>(),
    actions: 0,
    eventCounts: {},
  };
}

export function createEmptyHourlySiteData(): HourlySiteData {
  return {
    totalVisits: 0,
    knownVisitors: new Set<string>(),
    anonymousVisitors: new Set<string>(),
    eventCounts: {},
  };
}

export function createEmptyHourlyEpinetData(): HourlyEpinetData {
  return {
    steps: {},
    transitions: {},
  };
}

export function createEmptyLeadMetrics(): LeadMetrics {
  return {
    total_visits: 0,
    last_activity: "",
    first_time_24h: 0,
    returning_24h: 0,
    first_time_7d: 0,
    returning_7d: 0,
    first_time_28d: 0,
    returning_28d: 0,
    first_time_24h_percentage: 0,
    returning_24h_percentage: 0,
    first_time_7d_percentage: 0,
    returning_7d_percentage: 0,
    first_time_28d_percentage: 0,
    returning_28d_percentage: 0,
    total_leads: 0,
  };
}

export function createEmptyStoryfragmentAnalytics(id: string): StoryfragmentAnalytics {
  return {
    id,
    slug: "",
    total_actions: 0,
    unique_visitors: 0,
    last_24h_actions: 0,
    last_7d_actions: 0,
    last_28d_actions: 0,
    last_24h_unique_visitors: 0,
    last_7d_unique_visitors: 0,
    last_28d_unique_visitors: 0,
    total_leads: 0,
  };
}

export function getHourKeysForTimeRange(hours: number): string[] {
  const keys = [];
  const now = new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
      new Date().getUTCHours()
    )
  );
  const hoursToGet = Math.min(hours, MAX_ANALYTICS_HOURS);
  for (let i = 0; i < hoursToGet; i++) {
    const hourDate = new Date(now.getTime() - i * 60 * 60 * 1000);
    const key = formatHourKey(hourDate);
    keys.push(key);
  }
  return keys;
}

export function getHoursBetween(startHourKey: string, endHourKey: string): number {
  if (!startHourKey || !endHourKey) return 0;

  const [startYear, startMonth, startDay, startHour] = startHourKey.split("-").map(Number);
  const [endYear, endMonth, endDay, endHour] = endHourKey.split("-").map(Number);

  const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, startHour));
  const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, endHour));

  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000)));
}

// Lock management for cache refresh operations
interface CacheLock {
  acquiredAt: number;
  expiresAt: number;
  tenantId: string;
  hourKey: string;
}

// Map of active locks: key format is "{type}-{tenantId}-{hourKey}"
const cacheLocks = new Map<string, CacheLock>();

// Lock TTL in milliseconds (30 seconds)
const LOCK_TTL_MS = 30000;

/**
 * Try to acquire a lock for a specific cache refresh operation
 * @param type The type of data being refreshed ('analytics' or 'epinet')
 * @param tenantId The tenant ID
 * @param hourKey The specific hour being refreshed, or 'current' for the current hour
 * @returns True if the lock was acquired, false otherwise
 */
export function tryAcquireCacheLock(
  type: "analytics" | "epinet",
  tenantId: string = "default",
  hourKey: string = "current"
): boolean {
  const now = Date.now();
  const lockKey = `${type}-${tenantId}-${hourKey}`;

  // Clean expired locks first
  cleanExpiredLocks();

  // Check if the lock is already held
  if (cacheLocks.has(lockKey)) {
    if (VERBOSE) console.log(`Cache lock already held for ${lockKey}`);
    return false;
  }

  // Acquire the lock
  cacheLocks.set(lockKey, {
    acquiredAt: now,
    expiresAt: now + LOCK_TTL_MS,
    tenantId,
    hourKey,
  });

  if (VERBOSE) console.log(`Cache lock acquired for ${lockKey}`);
  return true;
}

/**
 * Release a previously acquired lock
 * @param type The type of data being refreshed ('analytics' or 'epinet')
 * @param tenantId The tenant ID
 * @param hourKey The specific hour being refreshed, or 'current' for the current hour
 */
export function releaseCacheLock(
  type: "analytics" | "epinet",
  tenantId: string = "default",
  hourKey: string = "current"
): void {
  const lockKey = `${type}-${tenantId}-${hourKey}`;

  if (cacheLocks.has(lockKey)) {
    cacheLocks.delete(lockKey);
    if (VERBOSE) console.log(`Cache lock released for ${lockKey}`);
  }
}

/**
 * Clean up any expired locks to prevent deadlocks
 */
function cleanExpiredLocks(): void {
  const now = Date.now();

  for (const [key, lock] of cacheLocks.entries()) {
    if (lock.expiresAt <= now) {
      cacheLocks.delete(key);
      if (VERBOSE) console.log(`Expired cache lock removed for ${key}`);
    }
  }
}

// Add to @/store/analytics.ts
export const knownFingerprintsStore = map<{
  data: Record<string, Set<string>>;
  lastLoaded: Record<string, number>;
}>({
  data: {},
  lastLoaded: {},
});

// Helper function to check if a fingerprint is known
export function isKnownFingerprint(fingerprintId: string, tenantId: string = "default"): boolean {
  const store = knownFingerprintsStore.get();
  return store.data[tenantId]?.has(fingerprintId) || false;
}
