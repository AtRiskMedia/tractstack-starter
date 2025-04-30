import {
  hourlyAnalyticsStore,
  getHourKeysForTimeRange,
  createEmptyLeadMetrics,
  isAnalyticsCacheValid,
  type HourlySiteData,
  type HourlyContentData,
} from "@/store/analytics";
import { loadHourlyAnalytics } from "./hourlyAnalyticsLoader";
import type { LeadMetrics, StoryfragmentAnalytics, APIContext } from "@/types";

export async function computeLeadMetrics(context?: APIContext): Promise<LeadMetrics> {
  const tenantId = context?.locals?.tenant?.id || "default";
  if (!isAnalyticsCacheValid(tenantId)) {
    await loadHourlyAnalytics(672, context);
  }

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
  const returning_7d_percentage = total7d > 0 ? (metrics7d.knownVisitors.size / total7d) * 100 : 0;
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
  };
}

export async function computeStoryfragmentAnalytics(
  context?: APIContext
): Promise<StoryfragmentAnalytics[]> {
  const tenantId = context?.locals?.tenant?.id || "default";
  if (!isAnalyticsCacheValid(tenantId)) {
    await loadHourlyAnalytics(672, context);
  }

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
}

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
