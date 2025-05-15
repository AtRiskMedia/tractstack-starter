import {
  knownFingerprintsStore,
  hourlyEpinetStore,
  getHourKeysForTimeRange,
} from "@/store/analytics";
import { getFullContentMap } from "@/utils/db/turso";
import type {
  DashboardAnalytics,
  LineDataSeries,
  HotItem,
  StoryfragmentAnalytics,
  APIContext,
} from "@/types";

const VERBOSE = false;

/**
 * Computes dashboard analytics from the hourly epinet data
 * @param duration The time range to compute analytics for (daily, weekly, monthly)
 * @param context The API context
 * @returns A DashboardAnalytics object
 */
export async function computeDashboardAnalytics(
  duration: string = "weekly",
  context?: APIContext
): Promise<DashboardAnalytics> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const store = hourlyEpinetStore.get();
  const tenantData = store.data[tenantId];

  // If no data is available yet, return empty analytics
  if (!tenantData || Object.keys(tenantData).length === 0) {
    return createEmptyDashboardAnalytics();
  }

  const hoursToAnalyze = duration === "daily" ? 24 : duration === "weekly" ? 7 * 24 : 28 * 24;
  const hourKeys = getHourKeysForTimeRange(hoursToAnalyze);

  const stats = {
    daily: computeAllEvents(tenantData, getHourKeysForTimeRange(24)),
    weekly: computeAllEvents(tenantData, getHourKeysForTimeRange(7 * 24)),
    monthly: computeAllEvents(tenantData, getHourKeysForTimeRange(28 * 24)),
  };

  const line = computeLineData(tenantData, hourKeys, duration);
  const hot_content = computeHotContent(tenantData, hourKeys);

  if (VERBOSE) {
    console.log(
      `[DASHBOARD ANALYTICS] hourKeys: ${hourKeys.length}, first: ${hourKeys[0]}, last: ${hourKeys[hourKeys.length - 1]}`
    );
  }

  return {
    stats,
    line,
    hot_content,
  };
}

/**
 * Computes the total events for a given time period, using epinet data
 * This function counts visitors across all epinet steps
 */
function computeAllEvents(
  tenantData: Record<string, Record<string, Record<string, any>>>,
  hourKeys: string[]
): number {
  let total = 0;

  // Iterate through all epinets
  for (const epinetId in tenantData) {
    const epinetData = tenantData[epinetId];

    // For each requested hour
    for (const hourKey of hourKeys) {
      if (!epinetData[hourKey]) continue;

      // Count events from all steps in this hour
      for (const stepId in epinetData[hourKey].steps) {
        const step = epinetData[hourKey].steps[stepId];
        // Each visitor counts as one event
        total += step.visitors.size;
      }
    }
  }

  return total;
}

function computeLineData(
  tenantData: Record<string, Record<string, Record<string, any>>>,
  hourKeys: string[],
  duration: string
): LineDataSeries[] {
  // Determine periods based on duration
  const periodsToDisplay = duration === "daily" ? 24 : duration === "weekly" ? 7 : 28;

  // Find all event types by parsing node IDs across all epinets
  const eventTypes = new Set<string>();
  const eventCountsByPeriod: Record<string, Record<number, number>> = {};

  // First, collect all event types and initialize the data structure
  for (const epinetId in tenantData) {
    const epinetData = tenantData[epinetId];

    for (const hourKey of hourKeys) {
      if (!epinetData[hourKey]) continue;

      // Analyze step IDs to extract event types (verbs)
      for (const stepId in epinetData[hourKey].steps) {
        // Parse the step ID to extract the event type (verb)
        // Node ID format depends on the type but typically includes the verb
        // e.g., 'commitmentAction-StoryFragment-ENTERED-01JD2RFH35HX8MQMBJ3344KHS5'
        // or 'belief-BELIEVES_YES-01JD2RFH35HX8MQMBJ3344KHS5'
        const parts = stepId.split("-");

        let eventType = "";

        if (parts[0] === "belief") {
          // Format: belief-VERB-contentID
          eventType = parts[1];
        } else if (parts[0] === "identifyAs") {
          // Format: identifyAs-OBJECT-contentID
          eventType = "IDENTIFY_AS";
        } else if (parts[0] === "commitmentAction" || parts[0] === "conversionAction") {
          // Format: commitmentAction-StoryFragment-VERB-contentID
          eventType = parts[2];
        }

        if (eventType) {
          eventTypes.add(eventType);

          // Initialize structure for this event type if needed
          if (!eventCountsByPeriod[eventType]) {
            eventCountsByPeriod[eventType] = {};
          }
        }
      }
    }
  }

  // Now process hourly data to count events
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // For each epinet, hour, and step, count visitors
  for (const epinetId in tenantData) {
    const epinetData = tenantData[epinetId];

    for (const hourKey of hourKeys) {
      if (!epinetData[hourKey]) continue;

      // Calculate the period index for this hour
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

      // Process each step in this hour
      for (const stepId in epinetData[hourKey].steps) {
        const step = epinetData[hourKey].steps[stepId];
        const parts = stepId.split("-");

        let eventType = "";

        if (parts[0] === "belief") {
          eventType = parts[1];
        } else if (parts[0] === "identifyAs") {
          eventType = "IDENTIFY_AS";
        } else if (parts[0] === "commitmentAction" || parts[0] === "conversionAction") {
          eventType = parts[2];
        }

        if (eventType && eventCountsByPeriod[eventType]) {
          // Add visitors to the event count for this period
          eventCountsByPeriod[eventType][periodIndex] =
            (eventCountsByPeriod[eventType][periodIndex] || 0) + step.visitors.size;
        }
      }
    }
  }

  // Format the result as LineDataSeries
  const result: LineDataSeries[] = [];

  eventTypes.forEach((eventType) => {
    const data = [];
    for (let i = 0; i < periodsToDisplay; i++) {
      data.push({ x: i, y: eventCountsByPeriod[eventType][i] || 0 });
    }

    result.push({
      id: eventType,
      data,
    });
  });

  return result;
}

/**
 * Computes hot content by analyzing epinet steps and counting events per content ID
 */
function computeHotContent(
  tenantData: Record<string, Record<string, Record<string, any>>>,
  hourKeys: string[]
): HotItem[] {
  const contentCounts: Map<string, { total_events: number; type?: string }> = new Map();

  // Process each epinet
  for (const epinetId in tenantData) {
    const epinetData = tenantData[epinetId];

    // For each requested hour
    for (const hourKey of hourKeys) {
      if (!epinetData[hourKey]) continue;

      // Process each step in this hour to extract content ID
      for (const stepId in epinetData[hourKey].steps) {
        const step = epinetData[hourKey].steps[stepId];
        const parts = stepId.split("-");

        let contentId = "";
        let contentType: string | undefined = undefined;

        // Extract content ID based on step format
        if (parts[0] === "belief" || parts[0] === "identifyAs") {
          // Format: type-value-contentID
          contentId = parts[parts.length - 1];
        } else if (parts[0] === "commitmentAction" || parts[0] === "conversionAction") {
          // Format: type-objectType-verb-contentID
          contentId = parts[parts.length - 1];
          contentType = parts[1]; // This is usually "StoryFragment" or "Pane"
        }

        if (contentId) {
          const existing = contentCounts.get(contentId) || { total_events: 0, type: contentType };
          existing.total_events += step.visitors.size;
          contentCounts.set(contentId, existing);
        }
      }
    }
  }

  // Format and sort the result
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

/**
 * Compute storyfragment analytics from hourly epinet data
 * @param context API context for tenant information
 * @returns Storyfragment analytics list
 */
export async function computeStoryfragmentAnalytics(
  context?: APIContext
): Promise<StoryfragmentAnalytics[]> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const store = hourlyEpinetStore.get();
  const tenantData = store.data[tenantId];

  // If no data is available yet, return empty analytics
  if (!tenantData || Object.keys(tenantData).length === 0) {
    return [];
  }

  // Get all content IDs from epinet data
  const contentMap = new Map<
    string,
    {
      id: string;
      type?: string;
      totalEvents: number;
      uniqueVisitors: Set<string>;
      events24h: number;
      visitors24h: Set<string>;
      events7d: number;
      visitors7d: Set<string>;
      events28d: number;
      visitors28d: Set<string>;
      slug?: string;
    }
  >();

  // Get hour keys for various time periods
  const hours24 = getHourKeysForTimeRange(24);
  const hours7d = getHourKeysForTimeRange(168);
  const hours28d = getHourKeysForTimeRange(672);

  // Process each epinet
  for (const epinetId in tenantData) {
    const epinetData = tenantData[epinetId];

    // For each hour in the epinet data
    for (const hourKey of Object.keys(epinetData)) {
      const isIn24h = hours24.includes(hourKey);
      const isIn7d = hours7d.includes(hourKey);
      const isIn28d = hours28d.includes(hourKey);

      // Process each step in this hour to extract content ID
      for (const stepId in epinetData[hourKey].steps) {
        const step = epinetData[hourKey].steps[stepId];
        const parts = stepId.split("-");

        let contentId = "";
        let contentType: string | undefined = undefined;

        // Extract content ID based on step format
        if (parts[0] === "belief" || parts[0] === "identifyAs") {
          // Format: type-value-contentID
          contentId = parts[parts.length - 1];
        } else if (parts[0] === "commitmentAction" || parts[0] === "conversionAction") {
          // Format: type-objectType-verb-contentID
          contentId = parts[parts.length - 1];
          contentType = parts[1]; // This is usually "StoryFragment" or "Pane"
        }

        if (contentId && (contentType === "StoryFragment" || contentType === "Pane")) {
          // Initialize content entry if needed
          if (!contentMap.has(contentId)) {
            contentMap.set(contentId, {
              id: contentId,
              type: contentType,
              totalEvents: 0,
              uniqueVisitors: new Set(),
              events24h: 0,
              visitors24h: new Set(),
              events7d: 0,
              visitors7d: new Set(),
              events28d: 0,
              visitors28d: new Set(),
            });
          }

          const content = contentMap.get(contentId)!;

          // Update total events and visitors
          content.totalEvents += step.visitors.size;
          step.visitors.forEach((visitor) => content.uniqueVisitors.add(visitor));

          // Update time-specific metrics
          if (isIn24h) {
            content.events24h += step.visitors.size;
            step.visitors.forEach((visitor) => content.visitors24h.add(visitor));
          }

          if (isIn7d) {
            content.events7d += step.visitors.size;
            step.visitors.forEach((visitor) => content.visitors7d.add(visitor));
          }

          if (isIn28d) {
            content.events28d += step.visitors.size;
            step.visitors.forEach((visitor) => content.visitors28d.add(visitor));
          }
        }
      }
    }
  }

  // Get total leads from knownFingerprintsStore
  const knownFingerprints = knownFingerprintsStore.get();
  const totalLeads = knownFingerprints.data[tenantId]?.size || 0;

  const contentMapItems = await getFullContentMap(context);
  const slugMapping = new Map<string, string>();
  contentMapItems.forEach((item) => {
    if (item.id && item.slug) {
      slugMapping.set(item.id, item.slug);
    }
  });

  // Convert map to array of StoryfragmentAnalytics
  const result: StoryfragmentAnalytics[] = [];

  contentMap.forEach((content, id) => {
    result.push({
      id,
      slug: slugMapping.get(id) || "",
      total_actions: content.totalEvents,
      unique_visitors: content.uniqueVisitors.size,
      last_24h_actions: content.events24h,
      last_7d_actions: content.events7d,
      last_28d_actions: content.events28d,
      last_24h_unique_visitors: content.visitors24h.size,
      last_7d_unique_visitors: content.visitors7d.size,
      last_28d_unique_visitors: content.visitors28d.size,
      total_leads: totalLeads,
    });
  });

  return result;
}
