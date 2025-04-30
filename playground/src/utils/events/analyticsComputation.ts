import {
  hourlyAnalyticsStore,
  getHourKeysForTimeRange,
  createEmptyLeadMetrics,
} from "@/store/analytics";
import { loadHourlyAnalytics, refreshHourlyAnalytics } from "./hourlyAnalyticsLoader";
import type { LeadMetrics, StoryfragmentAnalytics, APIContext } from "@/types";

/**
 * Computes lead metrics from hourly analytics data
 * Drop-in replacement for getLeadMetrics in turso.ts
 */
export async function computeLeadMetrics(context?: APIContext): Promise<LeadMetrics> {
  if (!isAnalyticsCacheValid()) {
    await loadHourlyAnalytics(672, context);
  }

  const store = hourlyAnalyticsStore.get();

  if (!store.lastFullHour || Object.keys(store.siteData).length === 0) {
    return createEmptyLeadMetrics();
  }

  const hours24 = getHourKeysForTimeRange(24);
  const hours7d = getHourKeysForTimeRange(168); // 7 days
  const hours28d = getHourKeysForTimeRange(672); // 28 days

  const metrics24h = aggregateHourlySiteMetrics(store.siteData, hours24);
  const metrics7d = aggregateHourlySiteMetrics(store.siteData, hours7d);
  const metrics28d = aggregateHourlySiteMetrics(store.siteData, hours28d);

  const allHours = Object.keys(store.siteData);
  const totalMetrics = aggregateHourlySiteMetrics(store.siteData, allHours);

  const total24h = metrics24h.anonymousVisitors.size + metrics24h.knownVisitors.size;
  const total7d = metrics7d.anonymousVisitors.size + metrics7d.knownVisitors.size;
  const total28d = metrics28d.anonymousVisitors.size + metrics28d.knownVisitors.size;

  const first_time_24h_percentage =
    total24h > 0 ? (metrics24h.anonymousVisitors.size / total24h) * 100 : 0;

  const returning_24h_percentage =
    total24h > 0 ? (metrics24h.knownVisitors.size / total24h) * 100 : 0;

  const first_time_7d_percentage =
    total7d > 0 ? (metrics7d.anonymousVisitors.size / total7d) * 100 : 0;

  const returning_7d_percentage = total7d > 0 ? (metrics7d.knownVisitors.size / total7d) * 100 : 0;

  const first_time_28d_percentage =
    total28d > 0 ? (metrics28d.anonymousVisitors.size / total28d) * 100 : 0;

  const returning_28d_percentage =
    total28d > 0 ? (metrics28d.knownVisitors.size / total28d) * 100 : 0;

  return {
    total_visits: totalMetrics.totalVisits,
    clicked_events: totalMetrics.clickedEvents,
    entered_events: totalMetrics.enteredEvents,
    last_activity: store.lastActivity || "",
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
    total_leads: store.totalLeads,
  };
}

/**
 * Computes storyfragment analytics from hourly data
 * Drop-in replacement for computeStoryfragmentAnalytics in turso.ts
 */
export async function computeStoryfragmentAnalytics(
  context?: APIContext
): Promise<StoryfragmentAnalytics[]> {
  const store = hourlyAnalyticsStore.get();
  const now = new Date();

  // Force reload if lastFullHour is outdated
  const currentHour = store.lastFullHour ? store.lastFullHour.split("-").map(Number) : [0, 0, 0, 0];
  const currentHourDate = new Date(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours()
  );
  const lastFullHourDate = store.lastFullHour
    ? new Date(currentHour[0], currentHour[1] - 1, currentHour[2], currentHour[3])
    : new Date(0);
  const hoursDiff = (currentHourDate.getTime() - lastFullHourDate.getTime()) / (1000 * 60 * 60);

  if (!isAnalyticsCacheValid() || hoursDiff > 1) {
    await loadHourlyAnalytics(672, context);
  } else {
    await refreshHourlyAnalytics(context);
  }

  const result: StoryfragmentAnalytics[] = [];
  const hours24 = getHourKeysForTimeRange(24);
  const hours7d = getHourKeysForTimeRange(168);
  const hours28d = getHourKeysForTimeRange(672);

  for (const contentId of Object.keys(store.contentData)) {
    const contentData = store.contentData[contentId];
    const slug = Array.from(store.slugMap.entries()).find(([_, id]) => id === contentId)?.[0] || "";

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
      total_leads: store.totalLeads,
    });
  }

  return result;
}

/**
 * Helper function to aggregate site metrics across multiple hours
 */
function aggregateHourlySiteMetrics(
  siteData: Record<string, import("@/store/analytics").HourlySiteData>,
  hourKeys: string[]
) {
  const anonymousVisitors = new Set<string>();
  const knownVisitors = new Set<string>();
  let totalVisits = 0;
  let clickedEvents = 0;
  let enteredEvents = 0;

  hourKeys.forEach((hour) => {
    if (siteData[hour]) {
      siteData[hour].anonymousVisitors.forEach((id) => anonymousVisitors.add(id));
      siteData[hour].knownVisitors.forEach((id) => knownVisitors.add(id));
      totalVisits += siteData[hour].totalVisits;
      clickedEvents += siteData[hour].clickedEvents;
      enteredEvents += siteData[hour].enteredEvents;
    }
  });

  return {
    anonymousVisitors,
    knownVisitors,
    totalVisits,
    clickedEvents,
    enteredEvents,
  };
}

/**
 * Helper function to aggregate content metrics across multiple hours
 */
function aggregateHourlyContentMetrics(
  contentData: Record<string, import("@/store/analytics").HourlyContentData>,
  hourKeys: string[]
) {
  const uniqueVisitors = new Set<string>();
  const knownVisitors = new Set<string>();
  const anonymousVisitors = new Set<string>();
  let actions = 0;
  let clickedEvents = 0;
  let enteredEvents = 0;

  hourKeys.forEach((hour) => {
    if (contentData[hour]) {
      contentData[hour].uniqueVisitors.forEach((id) => uniqueVisitors.add(id));
      contentData[hour].knownVisitors.forEach((id) => knownVisitors.add(id));
      contentData[hour].anonymousVisitors.forEach((id) => anonymousVisitors.add(id));
      actions += contentData[hour].actions;
      clickedEvents += contentData[hour].clickedEvents;
      enteredEvents += contentData[hour].enteredEvents;
    }
  });

  return {
    uniqueVisitors,
    knownVisitors,
    anonymousVisitors,
    actions,
    clickedEvents,
    enteredEvents,
  };
}

/**
 * Check if analytics cache is valid and ready for use
 */
function isAnalyticsCacheValid(): boolean {
  const { lastFullHour } = hourlyAnalyticsStore.get();
  return !!lastFullHour && Object.keys(hourlyAnalyticsStore.get().contentData).length > 0;
}
