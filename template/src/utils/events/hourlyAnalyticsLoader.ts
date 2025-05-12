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
      const currentDate = new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate(),
          new Date().getUTCHours()
        )
      );
      const currentHourKey = formatHourKey(currentDate);
      hourKeys = [currentHourKey];

      const hourParts = currentHourKey.split("-").map(Number);
      startTime = new Date(Date.UTC(hourParts[0], hourParts[1] - 1, hourParts[2], hourParts[3]));
      endTime = new Date(Date.UTC(hourParts[0], hourParts[1] - 1, hourParts[2], hourParts[3]));
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
        Date.UTC(firstHourParts[0], firstHourParts[1] - 1, firstHourParts[2], firstHourParts[3])
      );
      endTime = new Date(
        Date.UTC(lastHourParts[0], lastHourParts[1] - 1, lastHourParts[2], lastHourParts[3])
      );
    }

    if (VERBOSE) {
      console.log(
        `[DEBUG-ANALYTICS] Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`
      );
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
      const currentDate = new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate(),
          new Date().getUTCHours()
        )
      );
      const currentHourKey = formatHourKey(currentDate);
      const currentHourKeys = [currentHourKey];
      const historicalHourKeys = hourKeys.filter((key) => key !== currentHourKey);

      // Process current hour first if it's in our range
      if (hourKeys.includes(currentHourKey)) {
        const currentHourParts = currentHourKey.split("-").map(Number);
        const currentHourStart = new Date(
          Date.UTC(
            currentHourParts[0],
            currentHourParts[1] - 1,
            currentHourParts[2],
            currentHourParts[3]
          )
        );
        const currentHourEnd = new Date(currentHourStart);
        currentHourEnd.setUTCHours(currentHourEnd.getUTCHours() + 1);

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
          chunkEndTime.setUTCHours(chunkEndTime.getUTCHours() + 1);

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
      const oldestAllowedDate = new Date(
        Date.UTC(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          new Date().getUTCDate(),
          new Date().getUTCHours()
        )
      );
      oldestAllowedDate.setUTCHours(oldestAllowedDate.getUTCHours() - MAX_ANALYTICS_HOURS);

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
    const currentDate = new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate(),
        new Date().getUTCHours()
      )
    );
    currentStore.data[tenantId] = {
      contentData,
      siteData,
      lastFullHour: formatHourKey(currentDate),
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
      `[DEBUG-ANALYTICS] Processing time range: ${startTime.toISOString()} to ${endTime.toISOString()}, hourKeys:`,
      hourKeys
    );
  }

  // SITE DATA QUERY: Updated to handle timestamp formats and future timestamps
  const siteStart = Date.now();
  const { rows: siteRows } = await client.execute({
    sql: `
      WITH hourly_visits AS (
        SELECT
          strftime('%Y-%m-%d-%H', datetime(v.created_at, 'utc')) as hour_key,
          COUNT(DISTINCT v.id) as total_visits,
          GROUP_CONCAT(DISTINCT CASE WHEN f.lead_id IS NULL THEN v.fingerprint_id ELSE NULL END) as anonymous_fingerprints,
          GROUP_CONCAT(DISTINCT CASE WHEN f.lead_id IS NOT NULL THEN v.fingerprint_id ELSE NULL END) as known_fingerprints
        FROM visits v
        JOIN fingerprints f ON v.fingerprint_id = f.id
        WHERE datetime(v.created_at, 'utc') >= datetime(?, 'utc')
          AND datetime(v.created_at, 'utc') < datetime(?, 'utc')
          AND datetime(v.created_at, 'utc') <= datetime('now', 'utc')
        GROUP BY hour_key
      ),
      hourly_actions AS (
        SELECT
          hour_key,
          json_group_object(verb, verb_count) as event_counts
        FROM (
          SELECT
            strftime('%Y-%m-%d-%H', datetime(created_at, 'utc')) as hour_key,
            verb,
            COUNT(*) as verb_count
          FROM actions
          WHERE datetime(created_at, 'utc') >= datetime(?, 'utc')
            AND datetime(created_at, 'utc') < datetime(?, 'utc')
            AND datetime(created_at, 'utc') <= datetime('now', 'utc')
          GROUP BY hour_key, verb
        ) sub
        GROUP BY hour_key
      )
      SELECT
        COALESCE(hv.hour_key, ha.hour_key) as hour_key,
        COALESCE(hv.total_visits, 0) as total_visits,
        hv.anonymous_fingerprints,
        hv.known_fingerprints,
        COALESCE(ha.event_counts, '{}') as event_counts
      FROM hourly_visits hv
      FULL OUTER JOIN hourly_actions ha ON hv.hour_key = ha.hour_key
      WHERE COALESCE(hv.hour_key, ha.hour_key) IS NOT NULL
    `,
    args: [
      startTime.toISOString(),
      endTime.toISOString(),
      startTime.toISOString(),
      endTime.toISOString(),
    ],
  });
  if (VERBOSE) {
    console.log(`[DEBUG-ANALYTICS] Site query rows:`, siteRows);
    console.log(`[PERF] Site query took ${Date.now() - siteStart}ms`);
  }

  // Process site rows with dynamic initialization
  for (const row of siteRows) {
    const hourKey = String(row.hour_key);
    // Initialize siteData if not already present
    if (!siteData[hourKey]) {
      siteData[hourKey] = createEmptyHourlySiteData();
      if (VERBOSE) console.log(`[DEBUG-ANALYTICS] Initialized siteData for hourKey: ${hourKey}`);
    }

    const anonymousFingerprints = row.anonymous_fingerprints
      ? String(row.anonymous_fingerprints).split(",").filter(Boolean)
      : [];
    const knownFingerprints = row.known_fingerprints
      ? String(row.known_fingerprints).split(",").filter(Boolean)
      : [];

    siteData[hourKey].totalVisits = Number(row.total_visits || 0);
    siteData[hourKey].anonymousVisitors = new Set(anonymousFingerprints);
    siteData[hourKey].knownVisitors = new Set(knownFingerprints);

    if (row.event_counts) {
      try {
        const eventCountsData = JSON.parse(String(row.event_counts));
        siteData[hourKey].eventCounts = eventCountsData;
      } catch (e) {
        console.error(`Error parsing site event_counts JSON for hour ${hourKey}:`, e);
        siteData[hourKey].eventCounts = {};
      }
    }
  }

  // CONTENT DATA QUERY: Unchanged, as leads metrics depend on siteData
  const contentStart = Date.now();
  const { rows: contentRows } = await client.execute({
    sql: `
      SELECT
        strftime('%Y-%m-%d-%H', datetime(a.created_at, 'utc')) as hour_key,
        a.object_id,
        a.object_type,
        COUNT(DISTINCT a.id) as action_count,
        GROUP_CONCAT(DISTINCT a.fingerprint_id) as fingerprints,
        GROUP_CONCAT(DISTINCT CASE WHEN f.lead_id IS NOT NULL THEN a.fingerprint_id ELSE NULL END) as known_fingerprints
      FROM actions a
      LEFT JOIN fingerprints f ON a.fingerprint_id = f.id
      WHERE
        datetime(a.created_at, 'utc') >= datetime(?, 'utc')
        AND datetime(a.created_at, 'utc') < datetime(?, 'utc')
        AND datetime(a.created_at, 'utc') <= datetime('now', 'utc')
        AND a.object_type IN ('StoryFragment', 'Pane')
      GROUP BY hour_key, a.object_id, a.object_type
    `,
    args: [startTime.toISOString(), endTime.toISOString()],
  });
  if (VERBOSE) {
    console.log(`[DEBUG-ANALYTICS] Content query rows:`, contentRows);
    console.log(`[PERF] Content query took ${Date.now() - contentStart}ms`);
  }

  // Process content rows
  for (const row of contentRows) {
    const hourKey = String(row.hour_key);
    const contentId = String(row.object_id);
    if (!contentData[contentId]) {
      contentData[contentId] = {};
    }
    if (!contentData[contentId][hourKey]) {
      contentData[contentId][hourKey] = createEmptyHourlyContentData();
    }

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
  const now = new Date(
    Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate(),
      new Date().getUTCHours()
    )
  );
  const currentHour = formatHourKey(now);

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
