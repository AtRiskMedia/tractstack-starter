import { map } from "nanostores";
import { ANALYTICS_CACHE_TTL } from "@/constants";
import type { LeadMetrics, StoryfragmentAnalytics } from "@/types";

export function formatHourKey(date: Date): string {
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date provided to formatHourKey");
  }
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
  name?: string;
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
}>({
  data: {},
  lastFullHour: {},
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

  if (!tenantData.lastFullHour || Object.keys(tenantData.contentData).length === 0) {
    return false;
  }

  const timeSinceUpdate = Date.now() - tenantData.lastUpdated;
  if (timeSinceUpdate >= ANALYTICS_CACHE_TTL) {
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
  const now = new Date();
  for (let i = 0; i < hours; i++) {
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

  const startDate = new Date(startYear, startMonth - 1, startDay, startHour);
  const endDate = new Date(endYear, endMonth - 1, endDay, endHour);

  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000)));
}
