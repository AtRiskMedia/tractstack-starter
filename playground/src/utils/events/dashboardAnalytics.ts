import { hourlyAnalyticsStore, getHourKeysForTimeRange } from "@/store/analytics";
import type { DashboardAnalytics, LineDataSeries, HotItem } from "@/types";
import type { APIContext } from "@/types";

/**
 * Computes dashboard analytics from the hourly analytics data
 * @param duration The time range to compute analytics for (daily, weekly, monthly)
 * @param context The API context
 * @returns A DashboardAnalytics object
 */
export async function computeDashboardAnalytics(
  duration: string = "weekly",
  context?: APIContext
): Promise<DashboardAnalytics> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const store = hourlyAnalyticsStore.get();
  const tenantData = store.data[tenantId];

  // If no data is available yet, return empty analytics
  if (!tenantData || Object.keys(tenantData.siteData).length === 0) {
    return createEmptyDashboardAnalytics();
  }

  const hoursToAnalyze = duration === "daily" ? 24 : duration === "weekly" ? 7 * 24 : 28 * 24;
  const hourKeys = getHourKeysForTimeRange(hoursToAnalyze);
  const stats = {
    daily: computePageviewEvents(tenantData.siteData, getHourKeysForTimeRange(24)),
    weekly: computePageviewEvents(tenantData.siteData, getHourKeysForTimeRange(7 * 24)),
    monthly: computePageviewEvents(tenantData.siteData, getHourKeysForTimeRange(28 * 24)),
  };
  const line = computeLineData(tenantData.siteData, hourKeys, duration);
  const hot_content = computeHotContent(tenantData.contentData, hourKeys);

  return {
    stats,
    line,
    hot_content,
  };
}

/**
 * Computes the total PAGEVIEWED events for a given time period
 */
function computePageviewEvents(siteData: Record<string, any>, hourKeys: string[]): number {
  let total = 0;

  for (const hourKey of hourKeys) {
    const hourData = siteData[hourKey];
    if (hourData && hourData.eventCounts && hourData.eventCounts["PAGEVIEWED"]) {
      total += hourData.eventCounts["PAGEVIEWED"];
    }
  }

  return total;
}

function computeLineData(
  siteData: Record<string, any>,
  hourKeys: string[],
  duration: string
): LineDataSeries[] {
  // Determine periods based on duration
  const periodsToDisplay = duration === "daily" ? 24 : duration === "weekly" ? 7 : 28;

  // Find all event types
  const eventTypes = new Set<string>();
  for (const hourKey of hourKeys) {
    const hourData = siteData[hourKey];
    if (hourData?.eventCounts) {
      Object.keys(hourData.eventCounts).forEach((type) => eventTypes.add(type));
    }
  }

  // Initialize result
  const result: LineDataSeries[] = [];

  // For each event type, create a series with ALL periods
  eventTypes.forEach((type) => {
    const data = [];
    for (let i = 0; i < periodsToDisplay; i++) {
      data.push({ x: i, y: 0 });
    }

    result.push({
      id: type,
      data: data,
    });
  });

  // Process hourly data
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const hourKey of hourKeys) {
    const hourData = siteData[hourKey];
    if (!hourData?.eventCounts) continue;

    const [year, month, day, hour] = hourKey.split("-").map(Number);
    const dateOnly = new Date(year, month - 1, day);
    const hourDate = new Date(year, month - 1, day, hour);

    let periodIndex: number;
    if (duration === "daily") {
      // Hours ago (0-23)
      const hoursAgo = Math.floor((now.getTime() - hourDate.getTime()) / (1000 * 60 * 60));
      periodIndex = Math.min(hoursAgo, periodsToDisplay - 1);
    } else {
      // Days ago (0-6 or 0-27)
      const msPerDay = 24 * 60 * 60 * 1000;
      const daysAgo = Math.floor((todayStart.getTime() - dateOnly.getTime()) / msPerDay);
      periodIndex = Math.min(daysAgo, periodsToDisplay - 1);
    }

    if (periodIndex < 0 || periodIndex >= periodsToDisplay) continue;

    // Add event counts to the appropriate series
    for (const [eventType, count] of Object.entries(hourData.eventCounts)) {
      for (const series of result) {
        if (series.id === eventType) {
          series.data[periodIndex].y += Number(count);
          break;
        }
      }
    }
  }
  return result;
}

/**
 * Computes hot content by summing event counts for each content item
 */
function computeHotContent(
  contentData: Record<string, Record<string, any>>,
  hourKeys: string[]
): HotItem[] {
  const contentCounts: Map<string, { total_events: number; type?: string }> = new Map();

  for (const contentId of Object.keys(contentData)) {
    let totalEvents = 0;
    let contentType: string | undefined = undefined;

    for (const hourKey of hourKeys) {
      const hourData = contentData[contentId][hourKey];
      if (hourData) {
        totalEvents += hourData.actions || 0;
        if (!contentType && hourData.object_type) {
          contentType = String(hourData.object_type); // Use object_type directly
        }
      }
    }

    if (totalEvents > 0) {
      contentCounts.set(contentId, {
        total_events: totalEvents,
        type: contentType,
      });
    }
  }

  const sortedContent = Array.from(contentCounts.entries())
    .map(([id, data]) => ({
      id,
      total_events: data.total_events,
      type: data.type,
    }))
    .sort((a, b) => b.total_events - a.total_events);

  return sortedContent;
}

/**
 * Creates an empty dashboard analytics object
 */
export function createEmptyDashboardAnalytics(): DashboardAnalytics {
  return {
    stats: {
      daily: 0,
      weekly: 0,
      monthly: 0,
    },
    line: [],
    hot_content: [],
  };
}
