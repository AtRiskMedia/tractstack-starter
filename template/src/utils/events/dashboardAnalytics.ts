import { hourlyAnalyticsStore, getHourKeysForTimeRange } from "@/store/analytics";
import type { DashboardAnalytics, LineDataSeries, HotItem } from "@/types";
import type { APIContext } from "@/types";

const VERBOSE = false;
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
    daily: computeAllEvents(tenantData, getHourKeysForTimeRange(24)),
    weekly: computeAllEvents(tenantData, getHourKeysForTimeRange(7 * 24)),
    monthly: computeAllEvents(tenantData, getHourKeysForTimeRange(28 * 24)),
  };
  const line = computeLineData(tenantData.siteData, hourKeys, duration);
  const hot_content = computeHotContent(tenantData.contentData, hourKeys);

  if (VERBOSE) {
    console.log(
      `[DEBUG] hourKeys: ${hourKeys.length}, first: ${hourKeys[0]}, last: ${hourKeys[hourKeys.length - 1]}`
    );
    console.log(
      `[DEBUG] Event types in data: ${Array.from(
        Object.keys(tenantData.siteData).reduce((set, hourKey) => {
          const hourData = tenantData.siteData[hourKey];
          if (hourData?.eventCounts) {
            Object.keys(hourData.eventCounts).forEach((type) => set.add(type));
          }
          return set;
        }, new Set())
      ).join(", ")}`
    );
    console.log(
      "[DEBUG] All event types in raw data:",
      Array.from(
        Object.keys(tenantData.siteData).reduce((set, hourKey) => {
          const hourData = tenantData.siteData[hourKey];
          if (hourData?.eventCounts) {
            Object.keys(hourData.eventCounts).forEach((type) => set.add(type));
          }
          return set;
        }, new Set())
      )
    );
  }

  return {
    stats,
    line,
    hot_content,
  };
}

/**
 * Computes the total events for a given time period, including all event types
 * from both site data and content data
 */
function computeAllEvents(tenantData: Record<string, any>, hourKeys: string[]): number {
  let total = 0;

  // Count events from content data
  for (const contentId of Object.keys(tenantData.contentData)) {
    for (const hourKey of hourKeys) {
      const hourData = tenantData.contentData[contentId][hourKey];
      if (hourData) {
        total += hourData.actions || 0;
      }
    }
  }
  // Count events from site data
  for (const hourKey of hourKeys) {
    const hourData = tenantData.siteData[hourKey];
    if (hourData && hourData.eventCounts) {
      // Count all event types, not just PAGEVIEWED
      Object.values(hourData.eventCounts).forEach((count) => {
        total += Number(count);
      });
    }
  }

  // Count events from content data
  for (const contentId of Object.keys(tenantData.contentData)) {
    for (const hourKey of hourKeys) {
      const hourData = tenantData.contentData[contentId][hourKey];
      if (hourData) {
        // Add actions from content-specific data
        total += hourData.actions || 0;
      }
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
      const hoursAgo = Math.floor((now.getTime() - hourDate.getTime()) / (1000 * 60 * 60));
      if (hoursAgo >= -23 && hoursAgo <= 23) {
        periodIndex = hoursAgo < 0 ? Math.abs(hoursAgo) : hoursAgo;
        if (periodIndex >= periodsToDisplay) {
          continue;
        }
      } else {
        continue;
      }
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
