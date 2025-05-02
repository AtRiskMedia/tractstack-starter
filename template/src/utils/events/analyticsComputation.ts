import {
  hourlyAnalyticsStore,
  getHourKeysForTimeRange,
  createEmptyLeadMetrics,
  isAnalyticsCacheValid,
  type HourlySiteData,
  type HourlyContentData,
} from "@/store/analytics";
import { loadHourlyAnalytics } from "./hourlyAnalyticsLoader";
import { getAnalyticsLoadingStatus } from "./hourlyAnalyticsLoader";
import type { LeadMetrics, StoryfragmentAnalytics, APIContext } from "@/types";

// Track computation state per tenant to avoid redundant calculations
const computationState: Record<
  string,
  {
    leadMetricsLastComputed: number;
    storyfragmentAnalyticsLastComputed: number;
    pendingComputations: boolean;
  }
> = {};

const COMPUTATION_THROTTLE_MS = 5000; // 5 seconds

/**
 * Compute lead metrics from hourly analytics data
 * @param context API context for tenant information
 * @returns Lead metrics or loading status
 */
export async function computeLeadMetrics(
  context?: APIContext
): Promise<LeadMetrics & { status?: string }> {
  const tenantId = context?.locals?.tenant?.id || "default";

  // Initialize computation state for this tenant if needed
  if (!computationState[tenantId]) {
    computationState[tenantId] = {
      leadMetricsLastComputed: 0,
      storyfragmentAnalyticsLastComputed: 0,
      pendingComputations: false,
    };
  }

  // Check if cache is valid
  const isValid = isAnalyticsCacheValid(tenantId);
  const now = Date.now();

  // If data is loading and was recently computed, return the most recent data
  // This prevents redundant calculations while data is being loaded
  const loadingStatus = getAnalyticsLoadingStatus(tenantId);
  if (
    loadingStatus.loading &&
    now - computationState[tenantId].leadMetricsLastComputed < COMPUTATION_THROTTLE_MS
  ) {
    // Return empty data with loading status
    return {
      ...createEmptyLeadMetrics(),
      status: "loading",
    };
  }

  // If cache is invalid, trigger loading in the background if not already loading
  if (!isValid && !loadingStatus.loading) {
    computationState[tenantId].pendingComputations = true;

    // Create a non-blocking promise to load the data
    const loadingPromise = loadHourlyAnalytics(672, context).catch((error) => {
      console.error("Error loading analytics for lead metrics:", error);
    });

    // Fire and forget - don't await this promise
    loadingPromise.finally(() => {
      computationState[tenantId].pendingComputations = false;
    });

    // Return empty metrics with loading status
    return {
      ...createEmptyLeadMetrics(),
      status: "loading",
    };
  }

  // Use whatever data we have, even if it's partially loaded or outdated
  try {
    computationState[tenantId].leadMetricsLastComputed = now;

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

    if (!tenantData.lastFullHour || Object.keys(tenantData.siteData).length === 0) {
      if (loadingStatus.loading || computationState[tenantId].pendingComputations) {
        return {
          ...createEmptyLeadMetrics(),
          status: "loading",
        };
      }
      return createEmptyLeadMetrics();
    }

    const hours24 = getHourKeysForTimeRange(24);
    const hours7d = getHourKeysForTimeRange(168);
    const hours28d = getHourKeysForTimeRange(672);

    const metrics24h = aggregateHourlySiteMetrics(tenantData.siteData, hours24);
    const metrics7d = aggregateHourlySiteMetrics(tenantData.siteData, hours7d);
    const metrics28d = aggregateHourlySiteMetrics(tenantData.siteData, hours28d);

    const allHours = Object.keys(tenantData.siteData);
    const totalMetrics = aggregateHourlySiteMetrics(tenantData.siteData, allHours);

    const total24h = metrics24h.anonymousVisitors.size + metrics24h.knownVisitors.size;
    const total7d = metrics7d.anonymousVisitors.size + metrics7d.knownVisitors.size;
    const total28d = metrics28d.anonymousVisitors.size + metrics28d.knownVisitors.size;

    const first_time_24h_percentage =
      total24h > 0 ? (metrics24h.anonymousVisitors.size / total24h) * 100 : 0;
    const returning_24h_percentage =
      total24h > 0 ? (metrics24h.knownVisitors.size / total24h) * 100 : 0;
    const first_time_7d_percentage =
      total7d > 0 ? (metrics7d.anonymousVisitors.size / total7d) * 100 : 0;
    const returning_7d_percentage =
      total7d > 0 ? (metrics7d.knownVisitors.size / total7d) * 100 : 0;
    const first_time_28d_percentage =
      total28d > 0 ? (metrics28d.anonymousVisitors.size / total28d) * 100 : 0;
    const returning_28d_percentage =
      total28d > 0 ? (metrics28d.knownVisitors.size / total28d) * 100 : 0;

    return {
      total_visits: totalMetrics.totalVisits,
      last_activity: tenantData.lastActivity || "",
      first_time_24h: metrics24h.anonymousVisitors.size,
      returning_24h: metrics24h.knownVisitors.size,
      first_time_7d: metrics7d.anonymousVisitors.size,
      returning_7d: metrics7d.knownVisitors.size,
      first_time_28d: metrics28d.anonymousVisitors.size,
      returning_28d: metrics28d.knownVisitors.size,
      first_time_24h_percentage,
      returning_24h_percentage,
      first_time_7d_percentage,
      returning_7d_percentage,
      first_time_28d_percentage,
      returning_28d_percentage,
      total_leads: tenantData.totalLeads,
      status: loadingStatus.loading ? "loading" : "complete",
    };
  } catch (error) {
    console.error("Error computing lead metrics:", error);
    return {
      ...createEmptyLeadMetrics(),
      status: "error",
    };
  }
}

/**
 * Compute storyfragment analytics from hourly analytics data
 * @param context API context for tenant information
 * @returns Storyfragment analytics list or empty array with loading status
 */
export async function computeStoryfragmentAnalytics(
  context?: APIContext
): Promise<StoryfragmentAnalytics[]> {
  const tenantId = context?.locals?.tenant?.id || "default";

  // Initialize computation state for this tenant if needed
  if (!computationState[tenantId]) {
    computationState[tenantId] = {
      leadMetricsLastComputed: 0,
      storyfragmentAnalyticsLastComputed: 0,
      pendingComputations: false,
    };
  }

  // Check if cache is valid
  const isValid = isAnalyticsCacheValid(tenantId);
  const now = Date.now();

  // If data is loading and was recently computed, return the most recent data
  // This prevents redundant calculations while data is being loaded
  const loadingStatus = getAnalyticsLoadingStatus(tenantId);
  if (
    loadingStatus.loading &&
    now - computationState[tenantId].storyfragmentAnalyticsLastComputed < COMPUTATION_THROTTLE_MS
  ) {
    // Return empty array even though data is loading
    return [];
  }

  // If cache is invalid, trigger loading in the background if not already loading
  if (!isValid && !loadingStatus.loading) {
    computationState[tenantId].pendingComputations = true;

    // Create a non-blocking promise to load the data
    const loadingPromise = loadHourlyAnalytics(672, context).catch((error) => {
      console.error("Error loading analytics for storyfragment analytics:", error);
    });

    // Fire and forget - don't await this promise
    loadingPromise.finally(() => {
      computationState[tenantId].pendingComputations = false;
    });

    // Return empty array since data is being loaded
    return [];
  }

  // Use whatever data we have, even if it's partially loaded or outdated
  try {
    computationState[tenantId].storyfragmentAnalyticsLastComputed = now;

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

    const result: StoryfragmentAnalytics[] = [];
    const hours24 = getHourKeysForTimeRange(24);
    const hours7d = getHourKeysForTimeRange(168);
    const hours28d = getHourKeysForTimeRange(672);

    for (const contentId of Object.keys(tenantData.contentData)) {
      const contentData = tenantData.contentData[contentId];
      const slug =
        Array.from(tenantData.slugMap.entries()).find(([_, id]) => id === contentId)?.[0] || "";

      const metrics24h = aggregateHourlyContentMetrics(contentData, hours24);
      const metrics7d = aggregateHourlyContentMetrics(contentData, hours7d);
      const metrics28d = aggregateHourlyContentMetrics(contentData, hours28d);

      const allHours = Object.keys(contentData);
      const totalMetrics = aggregateHourlyContentMetrics(contentData, allHours);

      result.push({
        id: contentId,
        slug,
        total_actions: totalMetrics.actions,
        unique_visitors: totalMetrics.uniqueVisitors.size,
        last_24h_actions: metrics24h.actions,
        last_7d_actions: metrics7d.actions,
        last_28d_actions: metrics28d.actions,
        last_24h_unique_visitors: metrics24h.uniqueVisitors.size,
        last_7d_unique_visitors: metrics7d.uniqueVisitors.size,
        last_28d_unique_visitors: metrics28d.uniqueVisitors.size,
        total_leads: tenantData.totalLeads,
      });
    }
    return result;
  } catch (error) {
    console.error("Error computing storyfragment analytics:", error);
    return [];
  }
}

/**
 * Aggregate site metrics from hourly data
 */
function aggregateHourlySiteMetrics(siteData: Record<string, HourlySiteData>, hourKeys: string[]) {
  const anonymousVisitors = new Set<string>();
  const knownVisitors = new Set<string>();
  let totalVisits = 0;
  const eventCounts: Record<string, number> = {};

  hourKeys.forEach((hour) => {
    if (siteData[hour]) {
      siteData[hour].anonymousVisitors.forEach((id: string) => anonymousVisitors.add(id));
      siteData[hour].knownVisitors.forEach((id: string) => knownVisitors.add(id));
      totalVisits += siteData[hour].totalVisits;
      Object.entries(siteData[hour].eventCounts).forEach(([verb, count]) => {
        eventCounts[verb] = (eventCounts[verb] || 0) + (count as number);
      });
    }
  });

  return { anonymousVisitors, knownVisitors, totalVisits, eventCounts };
}

/**
 * Aggregate content metrics from hourly data
 */
function aggregateHourlyContentMetrics(
  contentData: Record<string, HourlyContentData>,
  hourKeys: string[]
) {
  const uniqueVisitors = new Set<string>();
  const knownVisitors = new Set<string>();
  const anonymousVisitors = new Set<string>();
  let actions = 0;
  const eventCounts: Record<string, number> = {};

  hourKeys.forEach((hour) => {
    if (contentData[hour]) {
      contentData[hour].uniqueVisitors.forEach((id: string) => uniqueVisitors.add(id));
      contentData[hour].knownVisitors.forEach((id: string) => knownVisitors.add(id));
      contentData[hour].anonymousVisitors.forEach((id: string) => anonymousVisitors.add(id));
      actions += contentData[hour].actions;
      Object.entries(contentData[hour].eventCounts).forEach(([verb, count]) => {
        eventCounts[verb] = (eventCounts[verb] || 0) + (count as number);
      });
    }
  });

  return { uniqueVisitors, knownVisitors, anonymousVisitors, actions, eventCounts };
}

/**
 * Check if analytics computation is in progress
 * @param context API context for tenant information
 * @returns Loading status
 */
export function isAnalyticsComputationPending(context?: APIContext): boolean {
  const tenantId = context?.locals?.tenant?.id || "default";

  if (!computationState[tenantId]) {
    return false;
  }

  const loadingStatus = getAnalyticsLoadingStatus(tenantId);
  return loadingStatus.loading || computationState[tenantId].pendingComputations;
}

/**
 * Force a refresh of analytics data
 * @param context API context for tenant information
 */
export function triggerAnalyticsRefresh(context?: APIContext): void {
  const tenantId = context?.locals?.tenant?.id || "default";

  // Initialize computation state for this tenant if needed
  if (!computationState[tenantId]) {
    computationState[tenantId] = {
      leadMetricsLastComputed: 0,
      storyfragmentAnalyticsLastComputed: 0,
      pendingComputations: false,
    };
  }

  const loadingStatus = getAnalyticsLoadingStatus(tenantId);
  if (!loadingStatus.loading) {
    computationState[tenantId].pendingComputations = true;

    // Create a non-blocking promise to load the data
    const loadingPromise = loadHourlyAnalytics(672, context).catch((error) => {
      console.error("Error refreshing analytics data:", error);
    });

    // Fire and forget - don't await this promise
    loadingPromise.finally(() => {
      computationState[tenantId].pendingComputations = false;
    });
  }
}
