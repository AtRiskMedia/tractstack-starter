import { tursoClient } from "@/utils/db/client";
import {
  hourlyAnalyticsStore,
  formatHourKey,
  createEmptyHourlySiteData,
  createEmptyHourlyContentData,
  getHourKeysForTimeRange,
  getHoursBetween,
} from "@/store/analytics";
import { parseHourKeyToDate } from "@/utils/common/helpers";
import { MAX_ANALYTICS_HOURS } from "@/constants";
import type { APIContext } from "@/types";

interface ActionRow {
  hour_key: string;
  object_id: string | null;
  object_type: string | null;
  fingerprints: string | null;
  total_actions: number;
  event_counts: string | null;
}

interface SiteRow {
  hour_key: string;
  total_visits: number;
  anonymous_fingerprints: string | null;
  known_fingerprints: string | null;
  event_counts: string | null;
}

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

const VERBOSE = true;

export async function loadHourlyAnalytics(
  hours: number = MAX_ANALYTICS_HOURS,
  context?: APIContext
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
    console.log(`Analytics loading already in progress for tenant: ${tenantId}`);
    return;
  }

  // Don't retry loading too frequently if there was a recent attempt
  if (now - loadingState[tenantId].lastLoadAttempt < LOADING_THROTTLE_MS) {
    console.log(`Analytics loading throttled for tenant: ${tenantId}`);
    return;
  }

  try {
    // Set loading state
    loadingState[tenantId].loading = true;
    loadingState[tenantId].lastLoadAttempt = now;
    loadingState[tenantId].error = null;

    const client = await tursoClient.getClient(context);
    if (!client) {
      throw new Error(`Failed to get database client for tenant ${tenantId}`);
    }

    const [{ rows: leadCountRows }, { rows: activityRows }] = await Promise.all([
      client.execute(`SELECT COUNT(*) as total_leads FROM leads`),
      client.execute(`SELECT MAX(created_at) as last_activity FROM visits`),
    ]);

    const totalLeads = Number(leadCountRows[0]?.total_leads || 0);
    const lastActivity = activityRows[0]?.last_activity
      ? String(activityRows[0].last_activity)
      : null;

    const hourKeys = getHourKeysForTimeRange(hours);
    if (!hourKeys.length) {
      return;
    }

    let endTime: Date;
    try {
      endTime = parseHourKeyToDate(hourKeys[0]);
      endTime.setHours(endTime.getHours() + 1);
    } catch (error) {
      console.debug("loadHourlyAnalytics: Error parsing hour keys", { error });
      throw error;
    }

    // Process data in chunks to avoid long-running queries
    // This approach breaks the work into smaller pieces
    const CHUNK_SIZE = 24; // 24 hours per chunk (1 day)
    let contentData: Record<string, Record<string, any>> = {};
    let siteData: Record<string, any> = {};

    // Function to process a chunk of hours
    const processHoursChunk = async (startIndex: number, chunkSize: number) => {
      const endIndex = Math.min(startIndex + chunkSize, hourKeys.length);
      const chunkHourKeys = hourKeys.slice(startIndex, endIndex);

      if (chunkHourKeys.length === 0) return;

      const chunkStartTime = parseHourKeyToDate(chunkHourKeys[chunkHourKeys.length - 1]);
      const chunkEndTime = parseHourKeyToDate(chunkHourKeys[0]);
      chunkEndTime.setHours(chunkEndTime.getHours() + 1);

      const { rows: contentRows } = await client.execute({
        sql: `
        WITH verb_counts AS (
          SELECT
            strftime('%Y-%m-%d-%H', created_at) as hour_key,
            object_id,
            object_type,
            verb,
            COUNT(*) as count
          FROM actions
          WHERE
            created_at >= ? AND created_at < ?
            AND object_type IN ('StoryFragment', 'Pane')
          GROUP BY hour_key, object_id, object_type, verb
        )
        SELECT
          vc.hour_key,
          vc.object_id,
          vc.object_type,
          GROUP_CONCAT(DISTINCT a.fingerprint_id) as fingerprints,
          SUM(vc.count) as total_actions,
          json_group_object(vc.verb, vc.count) as event_counts
        FROM verb_counts vc
        JOIN actions a ON
          a.object_id = vc.object_id AND
          a.object_type = vc.object_type AND
          strftime('%Y-%m-%d-%H', a.created_at) = vc.hour_key
        WHERE
          a.created_at >= ? AND a.created_at < ?
          AND a.object_type IN ('StoryFragment', 'Pane')
        GROUP BY vc.hour_key, vc.object_id, vc.object_type
      `,
        args: [
          chunkStartTime.toISOString(),
          chunkEndTime.toISOString(),
          chunkStartTime.toISOString(),
          chunkEndTime.toISOString(),
        ],
      });
      if (VERBOSE) console.log(`[DEBUG-LEADMETRICS] Polled ${contentRows.length} rows`);

      const { rows: siteRows } = await client.execute({
        sql: `
        WITH visit_fingerprints AS (
          SELECT
            v.id as visit_id,
            v.fingerprint_id,
            f.lead_id,
            strftime('%Y-%m-%d-%H', v.created_at) as hour_key
          FROM visits v
          JOIN fingerprints f ON v.fingerprint_id = f.id
          WHERE v.created_at >= ? AND v.created_at < ?
        ),
        verb_counts AS (
          SELECT
            strftime('%Y-%m-%d-%H', created_at) as hour_key,
            verb,
            COUNT(*) as count
          FROM actions
          WHERE created_at >= ? AND created_at < ?
          GROUP BY hour_key, verb
        )
        SELECT
          vf.hour_key,
          COUNT(DISTINCT vf.visit_id) as total_visits,
          GROUP_CONCAT(DISTINCT CASE WHEN vf.lead_id IS NULL THEN vf.fingerprint_id ELSE NULL END) as anonymous_fingerprints,
          GROUP_CONCAT(DISTINCT CASE WHEN vf.lead_id IS NOT NULL THEN vf.fingerprint_id ELSE NULL END) as known_fingerprints,
          (SELECT json_group_object(vc.verb, vc.count) FROM verb_counts vc WHERE vc.hour_key = vf.hour_key) as event_counts
        FROM visit_fingerprints vf
        GROUP BY vf.hour_key
      `,
        args: [
          chunkStartTime.toISOString(),
          chunkEndTime.toISOString(),
          chunkStartTime.toISOString(),
          chunkEndTime.toISOString(),
        ],
      });
      if (VERBOSE) console.log(`[DEBUG-LEADMETRICS] Polled ${siteRows.length} rows`);

      // Process content rows
      for (const row of contentRows as unknown as ActionRow[]) {
        if (!row.object_id) continue;

        const contentId = String(row.object_id);
        if (!contentData[contentId]) {
          contentData[contentId] = {};
        }

        const fingerprints = row.fingerprints
          ? String(row.fingerprints).split(",").filter(Boolean)
          : [];
        const knownFingerprints = fingerprints.filter((id) => {
          const hourSiteData = siteData[row.hour_key];
          return hourSiteData?.knownVisitors?.has(id);
        });
        const anonymousFingerprints = fingerprints.filter((id) => {
          const hourSiteData = siteData[row.hour_key];
          return hourSiteData?.anonymousVisitors?.has(id);
        });

        if (!contentData[contentId][row.hour_key]) {
          contentData[contentId][row.hour_key] = createEmptyHourlyContentData();
        }

        const hourData = contentData[contentId][row.hour_key];
        hourData.uniqueVisitors = new Set(fingerprints);
        hourData.knownVisitors = new Set(knownFingerprints);
        hourData.anonymousVisitors = new Set(anonymousFingerprints);
        hourData.actions = Number(row.total_actions || 0);
        if (row.event_counts) {
          try {
            hourData.eventCounts = JSON.parse(row.event_counts) || {};
          } catch (e) {
            console.error("Error parsing event_counts JSON:", e);
          }
        }
      }

      // Process site rows
      for (const row of siteRows as unknown as SiteRow[]) {
        const anonymousFingerprints = row.anonymous_fingerprints
          ? String(row.anonymous_fingerprints).split(",").filter(Boolean)
          : [];
        const knownFingerprints = row.known_fingerprints
          ? String(row.known_fingerprints).split(",").filter(Boolean)
          : [];
        let eventCounts: Record<string, number> = {};
        if (row.event_counts) {
          try {
            eventCounts = JSON.parse(row.event_counts) || {};
          } catch (e) {
            console.error("Error parsing event_counts JSON:", e);
          }
        }

        siteData[row.hour_key] = {
          totalVisits: Number(row.total_visits || 0),
          anonymousVisitors: new Set(anonymousFingerprints),
          knownVisitors: new Set(knownFingerprints),
          eventCounts,
        };
      }

      // Initialize any missing hour keys
      for (const hourKey of chunkHourKeys) {
        if (!siteData[hourKey]) {
          siteData[hourKey] = createEmptyHourlySiteData();
        }
      }
    };

    // Initialize all hour keys first to ensure structure is consistent
    for (const hourKey of hourKeys) {
      siteData[hourKey] = createEmptyHourlySiteData();
    }

    // Process data in chunks
    for (let i = 0; i < hourKeys.length; i += CHUNK_SIZE) {
      await processHoursChunk(i, CHUNK_SIZE);

      // update the store incrementally after each chunk
      // This allows the UI to show partial data while processing continues
      const currentStore = hourlyAnalyticsStore.get();
      const slugMap = new Map<string, string>();

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

      // Small delay to avoid blocking the event loop for too long
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Remove hour keys that are older than our window
    const oldestAllowedDate = new Date();
    oldestAllowedDate.setHours(oldestAllowedDate.getHours() - MAX_ANALYTICS_HOURS);
    Object.keys(contentData).forEach((contentId) => {
      const hourKeys = Object.keys(contentData[contentId]);
      hourKeys.forEach((hourKey) => {
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

    // Update the store with final data
    const slugMap = new Map<string, string>();
    const currentStore = hourlyAnalyticsStore.get();
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
  } catch (error) {
    console.error(`Error loading hourly analytics for tenant ${tenantId}:`, error);
    loadingState[tenantId].error = error instanceof Error ? error : new Error(String(error));
  } finally {
    // Clear loading state
    loadingState[tenantId].loading = false;
  }
}

export async function refreshHourlyAnalytics(context?: APIContext): Promise<void> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const currentStore = hourlyAnalyticsStore.get();
  const lastFullHour = currentStore.data[tenantId]?.lastFullHour || "";
  const currentHour = formatHourKey(new Date());

  // If we need a full analytics refresh
  const hoursSinceLastUpdate = lastFullHour
    ? Math.max(1, getHoursBetween(lastFullHour, currentHour))
    : MAX_ANALYTICS_HOURS;

  // Use a small hours value for refresh operations to make them faster
  const hoursToRefresh = Math.min(hoursSinceLastUpdate, 24);

  // Run the refresh in the background
  loadHourlyAnalytics(hoursToRefresh, context).catch((error) => {
    console.error("Error refreshing analytics:", error);
  });
}

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
