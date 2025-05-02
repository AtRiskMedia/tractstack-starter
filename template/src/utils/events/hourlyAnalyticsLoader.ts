import { tursoClient } from "@/utils/db/client";
import {
  hourlyAnalyticsStore,
  formatHourKey,
  createEmptyHourlySiteData,
  createEmptyHourlyContentData,
  getHourKeysForTimeRange,
  getHoursBetween,
} from "@/store/analytics";
import { getFullContentMap } from "@/utils/db/turso";
import { parseHourKeyToDate } from "@/utils/common/helpers";
import { MAX_ANALYTICS_HOURS } from "@/constants";
import type { APIContext } from "@/types";
import type { Client } from "@libsql/client";

// Track loading state per tenant
const loadingState: Record<
  string,
  {
    loading: boolean;
    lastLoadAttempt: number;
    error: Error | null;
  }
> = {};

const LOADING_THROTTLE_MS = 60000; // 1 minute
const VERBOSE = false;

// Only use two bins to simplify code complexity
const HISTORICAL_CHUNK_SIZE = 168; // Process historical data in 1-week chunks

/**
 * Loads hourly analytics data for the specified period
 * Uses a two-pass approach:
 * 1. First pass identifies relevant content IDs that have activity in the time period
 * 2. Second pass executes consolidated queries with database-level aggregation
 */
export async function loadHourlyAnalytics(
  hours: number = MAX_ANALYTICS_HOURS,
  context?: APIContext,
  currentHourOnly: boolean = false
): Promise<void> {
  const tenantId = context?.locals?.tenant?.id || "default";

  // Initialize loading state for this tenant if needed
  if (!loadingState[tenantId]) {
    loadingState[tenantId] = {
      loading: false,
      lastLoadAttempt: 0,
      error: null,
    };
  }

  // Check if already loading or throttled
  const now = Date.now();
  if (loadingState[tenantId].loading) {
    if (VERBOSE) console.log(`Analytics loading already in progress for tenant: ${tenantId}`);
    return;
  }

  // Don't retry loading too frequently if there was a recent attempt
  if (now - loadingState[tenantId].lastLoadAttempt < LOADING_THROTTLE_MS) {
    if (VERBOSE) console.log(`Analytics loading throttled for tenant: ${tenantId}`);
    return;
  }

  try {
    // Set loading state
    loadingState[tenantId].loading = true;
    loadingState[tenantId].lastLoadAttempt = now;
    loadingState[tenantId].error = null;

    if (VERBOSE)
      console.log(`[DEBUG-ANALYTICS] Starting load for tenant: ${tenantId}, hours: ${hours}`);

    const client = await tursoClient.getClient(context);
    if (!client) {
      throw new Error(`Failed to get database client for tenant ${tenantId}`);
    }

    // Get content map for resolving IDs and slugs
    const contentMap = await getFullContentMap(context);
    const slugMap = new Map<string, string>();
    contentMap.forEach((item) => {
      if ((item.type === "StoryFragment" || item.type === "Pane") && item.id && item.slug) {
        slugMap.set(item.slug, item.id);
      }
    });

    // Get global metrics once
    const [{ rows: leadCountRows }, { rows: activityRows }] = await Promise.all([
      client.execute(`SELECT COUNT(*) as total_leads FROM leads`),
      client.execute(`SELECT MAX(created_at) as last_activity FROM visits`),
    ]);

    const totalLeads = Number(leadCountRows[0]?.total_leads || 0);
    const lastActivity = activityRows[0]?.last_activity
      ? String(activityRows[0].last_activity)
      : null;

    // Set up time period for queries
    let hourKeys: string[];
    let startTime: Date, endTime: Date;

    if (currentHourOnly) {
      // For partial updates, only get the current hour
      const currentHourKey = formatHourKey(new Date());
      hourKeys = [currentHourKey];

      const hourParts = currentHourKey.split("-").map(Number);
      startTime = new Date(hourParts[0], hourParts[1] - 1, hourParts[2], hourParts[3]);
      endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);
    } else {
      // For full updates, get all hours in the specified range
      hourKeys = getHourKeysForTimeRange(hours);
      if (!hourKeys.length) {
        loadingState[tenantId].loading = false;
        return;
      }

      const firstHourParts = hourKeys[hourKeys.length - 1].split("-").map(Number);
      const lastHourParts = hourKeys[0].split("-").map(Number);

      startTime = new Date(
        firstHourParts[0],
        firstHourParts[1] - 1,
        firstHourParts[2],
        firstHourParts[3]
      );

      endTime = new Date(
        lastHourParts[0],
        lastHourParts[1] - 1,
        lastHourParts[2],
        lastHourParts[3]
      );
      endTime.setHours(endTime.getHours() + 1);
    }

    if (VERBOSE) {
      console.log(
        `[DEBUG-ANALYTICS] Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`
      );
      console.log(`[DEBUG-ANALYTICS] Total hours to process: ${hourKeys.length}`);
    }

    // Initialize or get the current analytics data structure
    const currentStore = hourlyAnalyticsStore.get();
    let contentData: Record<
      string,
      Record<string, ReturnType<typeof createEmptyHourlyContentData>>
    >;
    let siteData: Record<string, ReturnType<typeof createEmptyHourlySiteData>>;

    if (currentHourOnly && currentStore.data[tenantId]) {
      // For partial updates, keep the existing data and only update the current hour
      contentData = { ...currentStore.data[tenantId].contentData };
      siteData = { ...currentStore.data[tenantId].siteData };
    } else {
      // For full updates, initialize a new structure
      contentData = {};
      siteData = {};
      // Initialize all hour keys for site data
      for (const hourKey of hourKeys) {
        siteData[hourKey] = createEmptyHourlySiteData();
      }
    }

    // FIRST PASS: Identify all relevant content IDs that have activity in the time period
    const { rows: activeContentIds } = await client.execute({
      sql: `
        SELECT DISTINCT object_id, object_type
        FROM actions
        WHERE 
          created_at >= ? AND created_at < ?
          AND object_type IN ('StoryFragment', 'Pane')
      `,
      args: [startTime.toISOString(), endTime.toISOString()],
    });

    if (VERBOSE) {
      console.log(
        `[DEBUG-ANALYTICS] Found ${activeContentIds.length} active content items in time period`
      );
    }

    // Initialize content data structure for all active content IDs
    activeContentIds.forEach((row) => {
      const contentId = String(row.object_id);
      if (!contentData[contentId]) {
        contentData[contentId] = {};
      }

      // Initialize only the hour keys we're updating
      for (const hourKey of hourKeys) {
        if (!contentData[contentId][hourKey]) {
          contentData[contentId][hourKey] = createEmptyHourlyContentData();
        }
      }
    });

    // SECOND PASS: Execute consolidated queries to load data efficiently
    if (currentHourOnly) {
      // For current hour updates, just process that hour
      await processTimeRange(hourKeys, contentData, siteData, client, startTime, endTime);
    } else {
      // Split processing to handle current hour separately for more frequent updates
      const currentHourKey = formatHourKey(new Date());
      const currentHourKeys = [currentHourKey];
      const historicalHourKeys = hourKeys.filter((key) => key !== currentHourKey);

      // Process current hour first if it's in our range
      if (hourKeys.includes(currentHourKey)) {
        const currentHourParts = currentHourKey.split("-").map(Number);
        const currentHourStart = new Date(
          currentHourParts[0],
          currentHourParts[1] - 1,
          currentHourParts[2],
          currentHourParts[3]
        );
        const currentHourEnd = new Date(currentHourStart);
        currentHourEnd.setHours(currentHourEnd.getHours() + 1);

        await processTimeRange(
          currentHourKeys,
          contentData,
          siteData,
          client,
          currentHourStart,
          currentHourEnd
        );
      }

      // Process historical data in larger chunks
      if (historicalHourKeys.length > 0) {
        for (let i = 0; i < historicalHourKeys.length; i += HISTORICAL_CHUNK_SIZE) {
          const chunkHourKeys = historicalHourKeys.slice(
            i,
            Math.min(i + HISTORICAL_CHUNK_SIZE, historicalHourKeys.length)
          );
          if (chunkHourKeys.length === 0) continue;

          const chunkStartTime = parseHourKeyToDate(chunkHourKeys[chunkHourKeys.length - 1]);
          const chunkEndTime = parseHourKeyToDate(chunkHourKeys[0]);
          chunkEndTime.setHours(chunkEndTime.getHours() + 1);

          await processTimeRange(
            chunkHourKeys,
            contentData,
            siteData,
            client,
            chunkStartTime,
            chunkEndTime
          );

          // Small delay to avoid blocking the event loop for too long
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    }

    // Trim old hourly bins that are outside our time window
    if (!currentHourOnly) {
      const oldestAllowedDate = new Date();
      oldestAllowedDate.setHours(oldestAllowedDate.getHours() - MAX_ANALYTICS_HOURS);

      Object.keys(contentData).forEach((contentId) => {
        Object.keys(contentData[contentId]).forEach((hourKey) => {
          try {
            const hourDate = parseHourKeyToDate(hourKey);
            if (hourDate < oldestAllowedDate) {
              delete contentData[contentId][hourKey];
            }
          } catch (error) {
            console.error(`Error trimming content data hour key ${hourKey}:`, error);
          }
        });
      });

      Object.keys(siteData).forEach((hourKey) => {
        try {
          const hourDate = parseHourKeyToDate(hourKey);
          if (hourDate < oldestAllowedDate) {
            delete siteData[hourKey];
          }
        } catch (error) {
          console.error(`Error trimming site data hour key ${hourKey}:`, error);
        }
      });
    }

    // Final store update
    currentStore.data[tenantId] = {
      contentData,
      siteData,
      lastFullHour: formatHourKey(new Date()),
      lastUpdated: Date.now(),
      totalLeads,
      lastActivity,
      slugMap,
    };

    hourlyAnalyticsStore.set(currentStore);

    if (VERBOSE) {
      console.log(`[DEBUG-ANALYTICS] Loading completed for tenant: ${tenantId}`);
    }
  } catch (error) {
    console.error(`Error loading hourly analytics for tenant ${tenantId}:`, error);
    loadingState[tenantId].error = error instanceof Error ? error : new Error(String(error));
  } finally {
    // Clear loading state
    loadingState[tenantId].loading = false;
  }
}

/**
 * Process analytics data for a specific time range using consolidated queries
 * Fetches both content-specific and site-wide data
 */
async function processTimeRange(
  hourKeys: string[],
  contentData: Record<string, Record<string, ReturnType<typeof createEmptyHourlyContentData>>>,
  siteData: Record<string, ReturnType<typeof createEmptyHourlySiteData>>,
  client: Client,
  startTime: Date,
  endTime: Date
): Promise<void> {
  if (VERBOSE) {
    console.log(
      `[DEBUG-ANALYTICS] Processing time range: ${startTime.toISOString()} to ${endTime.toISOString()}`
    );
  }

  // CONTENT DATA QUERY: Consolidated query that pre-aggregates at the database level
  const { rows: contentRows } = await client.execute({
    sql: `
      WITH hourly_content_stats AS (
        -- First level of aggregation: Get key metrics per content item and hour
        SELECT
          strftime('%Y-%m-%d-%H', a.created_at) as hour_key,
          a.object_id,
          a.object_type,
          COUNT(DISTINCT a.id) as action_count,
          COUNT(DISTINCT a.fingerprint_id) as unique_visitors,
          GROUP_CONCAT(DISTINCT a.fingerprint_id) as fingerprints,
          GROUP_CONCAT(DISTINCT CASE WHEN f.lead_id IS NOT NULL THEN a.fingerprint_id ELSE NULL END) as known_fingerprints
        FROM actions a
        LEFT JOIN fingerprints f ON a.fingerprint_id = f.id
        WHERE
          a.created_at >= ? AND a.created_at < ?
          AND a.object_type IN ('StoryFragment', 'Pane')
        GROUP BY hour_key, a.object_id, a.object_type
      ),
      hourly_verb_counts AS (
        -- Second level: Calculate event counts per verb
        SELECT
          strftime('%Y-%m-%d-%H', created_at) as hour_key,
          object_id,
          object_type,
          verb,
          COUNT(*) as count,
          GROUP_CONCAT(DISTINCT fingerprint_id) as verb_fingerprints
        FROM actions
        WHERE
          created_at >= ? AND created_at < ?
          AND object_type IN ('StoryFragment', 'Pane')
        GROUP BY hour_key, object_id, object_type, verb
      )
      SELECT
        hcs.hour_key,
        hcs.object_id,
        hcs.object_type,
        hcs.action_count,
        hcs.unique_visitors,
        hcs.fingerprints,
        hcs.known_fingerprints,
        -- Use SQL's JSON functions to generate a proper event counts object
        json_group_object(hvc.verb, json_object(
          'count', hvc.count,
          'fingerprints', hvc.verb_fingerprints
        )) as event_counts
      FROM hourly_content_stats hcs
      LEFT JOIN hourly_verb_counts hvc ON
        hvc.hour_key = hcs.hour_key AND
        hvc.object_id = hcs.object_id AND
        hvc.object_type = hcs.object_type
      GROUP BY hcs.hour_key, hcs.object_id, hcs.object_type
    `,
    args: [
      startTime.toISOString(),
      endTime.toISOString(),
      startTime.toISOString(),
      endTime.toISOString(),
    ],
  });

  // SITE DATA QUERY: Consolidated query for site-wide metrics
  const { rows: siteRows } = await client.execute({
    sql: `
      WITH hourly_visits AS (
        -- Aggregate visits data by hour
        SELECT
          strftime('%Y-%m-%d-%H', v.created_at) as hour_key,
          COUNT(DISTINCT v.id) as total_visits,
          COUNT(DISTINCT v.fingerprint_id) as total_visitors,
          GROUP_CONCAT(DISTINCT CASE WHEN f.lead_id IS NULL THEN v.fingerprint_id ELSE NULL END) as anonymous_fingerprints,
          GROUP_CONCAT(DISTINCT CASE WHEN f.lead_id IS NOT NULL THEN v.fingerprint_id ELSE NULL END) as known_fingerprints
        FROM visits v
        JOIN fingerprints f ON v.fingerprint_id = f.id
        WHERE v.created_at >= ? AND v.created_at < ?
        GROUP BY hour_key
      ),
      hourly_actions AS (
        -- Aggregate actions data by hour and verb
        SELECT 
          strftime('%Y-%m-%d-%H', created_at) as hour_key,
          verb,
          COUNT(*) as count,
          GROUP_CONCAT(DISTINCT fingerprint_id) as verb_fingerprints
        FROM actions
        WHERE created_at >= ? AND created_at < ?
        GROUP BY hour_key, verb
      )
      SELECT
        hv.hour_key,
        hv.total_visits,
        hv.total_visitors,
        hv.anonymous_fingerprints,
        hv.known_fingerprints,
        -- Use correlated subquery with json_group_object to create the event counts JSON
        (
          SELECT json_group_object(verb, json_object(
            'count', count,
            'fingerprints', verb_fingerprints
          ))
          FROM hourly_actions ha
          WHERE ha.hour_key = hv.hour_key
        ) as event_counts
      FROM hourly_visits hv
    `,
    args: [
      startTime.toISOString(),
      endTime.toISOString(),
      startTime.toISOString(),
      endTime.toISOString(),
    ],
  });

  // Process site rows efficiently
  for (const row of siteRows) {
    const hourKey = String(row.hour_key);
    if (!hourKeys.includes(hourKey) || !siteData[hourKey]) continue;

    const anonymousFingerprints = row.anonymous_fingerprints
      ? String(row.anonymous_fingerprints).split(",").filter(Boolean)
      : [];
    const knownFingerprints = row.known_fingerprints
      ? String(row.known_fingerprints).split(",").filter(Boolean)
      : [];

    siteData[hourKey].totalVisits = Number(row.total_visits || 0);
    siteData[hourKey].anonymousVisitors = new Set(anonymousFingerprints);
    siteData[hourKey].knownVisitors = new Set(knownFingerprints);

    // Parse event counts JSON with proper error handling
    if (row.event_counts) {
      try {
        const eventCountsData = JSON.parse(String(row.event_counts));
        siteData[hourKey].eventCounts = {};

        // Process each verb's data
        for (const [verb, data] of Object.entries(eventCountsData)) {
          const typedData = data as { count: number; fingerprints: string };
          // Just store the count as a number, not the full object
          siteData[hourKey].eventCounts[verb] = Number(typedData.count || 0);
        }
      } catch (e) {
        console.error("Error parsing site event_counts JSON:", e);
        siteData[hourKey].eventCounts = {};
      }
    }
  }

  // Process content rows efficiently
  for (const row of contentRows) {
    const hourKey = String(row.hour_key);
    const contentId = String(row.object_id);

    if (!hourKeys.includes(hourKey) || !contentData[contentId] || !contentData[contentId][hourKey])
      continue;

    const allFingerprints = row.fingerprints
      ? String(row.fingerprints).split(",").filter(Boolean)
      : [];
    const knownFingerprints = row.known_fingerprints
      ? String(row.known_fingerprints).split(",").filter(Boolean)
      : [];

    const hourData = contentData[contentId][hourKey];
    hourData.uniqueVisitors = new Set(allFingerprints);
    hourData.knownVisitors = new Set(knownFingerprints);
    hourData.anonymousVisitors = new Set(
      allFingerprints.filter((id) => !knownFingerprints.includes(id))
    );
    hourData.actions = Number(row.action_count || 0);

    // Parse event counts JSON with proper error handling
    if (row.event_counts) {
      try {
        const eventCountsData = JSON.parse(String(row.event_counts));
        hourData.eventCounts = {};

        // Process each verb's data
        for (const [verb, data] of Object.entries(eventCountsData)) {
          const typedData = data as { count: number; fingerprints: string };
          // Just store the count as a number, not the full object
          hourData.eventCounts[verb] = Number(typedData.count || 0);
        }
      } catch (e) {
        console.error("Error parsing content event_counts JSON:", e);
        hourData.eventCounts = {};
      }
    }
  }
}

/**
 * Refreshes hourly analytics, typically called on a schedule
 * Only updates the current hour's data for efficiency
 */
export async function refreshHourlyAnalytics(context?: APIContext): Promise<void> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const currentStore = hourlyAnalyticsStore.get();
  const lastFullHour = currentStore.data[tenantId]?.lastFullHour || "";
  const currentHour = formatHourKey(new Date());

  if (lastFullHour === currentHour) {
    // Already updated this hour, just refresh current hour
    loadHourlyAnalytics(1, context, true).catch((error) => {
      console.error("Error refreshing current hour analytics:", error);
    });
    return;
  }

  // If we need a full analytics refresh
  const hoursSinceLastUpdate = lastFullHour
    ? Math.max(1, getHoursBetween(lastFullHour, currentHour))
    : MAX_ANALYTICS_HOURS;

  // Use a small hours value for refresh operations to make them faster
  const hoursToRefresh = Math.min(hoursSinceLastUpdate, 24);

  // Run the refresh in the background
  loadHourlyAnalytics(hoursToRefresh, context, false).catch((error) => {
    console.error("Error refreshing analytics:", error);
  });
}

/**
 * Gets the current loading status for analytics
 */
export function getAnalyticsLoadingStatus(tenantId: string = "default"): {
  loading: boolean;
  lastAttempt: number;
  error: Error | null;
} {
  if (!loadingState[tenantId]) {
    return {
      loading: false,
      lastAttempt: 0,
      error: null,
    };
  }

  return {
    loading: loadingState[tenantId].loading,
    lastAttempt: loadingState[tenantId].lastLoadAttempt,
    error: loadingState[tenantId].error,
  };
}
