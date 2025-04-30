import { tursoClient } from "@/utils/db/client";
import {
  hourlyAnalyticsStore,
  formatHourKey,
  createEmptyHourlySiteData,
  getHourKeysForTimeRange,
  getHoursBetween,
} from "@/store/analytics";
import type { APIContext } from "@/types";

interface ActionRow {
  hour_key: string;
  object_id: string | null;
  object_type: string | null;
  fingerprints: string | null;
  total_actions: number;
  clicked_events: number;
  entered_events: number;
}

interface SiteRow {
  hour_key: string;
  total_visits: number;
  anonymous_fingerprints: string | null;
  known_fingerprints: string | null;
  clicked_events: number;
  entered_events: number;
}

/**
 * Parses a hour key (YYYY-MM-DD-HH) into a valid Date object
 * @param hourKey Hour key in format YYYY-MM-DD-HH
 * @returns Date object
 * @throws Error if hourKey is invalid
 */
function parseHourKeyToDate(hourKey: string): Date {
  const parts = hourKey.split("-").map(Number);
  if (parts.length !== 4) {
    throw new Error(`Invalid hour key format: ${hourKey}`);
  }
  const [year, month, day, hour] = parts;
  if (
    isNaN(year) ||
    isNaN(month) ||
    isNaN(day) ||
    isNaN(hour) ||
    year < 1000 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23
  ) {
    throw new Error(`Invalid date values in hour key: ${hourKey}`);
  }
  const date = new Date(year, month - 1, day, hour);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date from hour key: ${hourKey}`);
  }
  return date;
}

/**
 * Loads hourly analytics data from Turso database
 * @param hours Number of hours back from now to load (default: 672 hours/28 days)
 * @param context API context for database access
 */
export async function loadHourlyAnalytics(
  hours: number = 672,
  context?: APIContext
): Promise<void> {
  const client = await tursoClient.getClient(context);
  if (!client) {
    return;
  }

  // Fetch aggregate metrics
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

  let startTime: Date, endTime: Date;
  try {
    startTime = parseHourKeyToDate(hourKeys[hours - 1]); // Earliest hour
    endTime = parseHourKeyToDate(hourKeys[0]); // Most recent hour
    endTime.setHours(endTime.getHours() + 1); // Include full last hour
  } catch (error) {
    console.debug("loadHourlyAnalytics: Error parsing hour keys", { error });
    throw error;
  }

  const { rows: contentRows } = await client.execute({
    sql: `
      SELECT 
        strftime('%Y-%m-%d-%H', created_at) as hour_key,
        object_id,
        object_type,
        GROUP_CONCAT(DISTINCT fingerprint_id) as fingerprints,
        COUNT(*) as total_actions,
        SUM(CASE WHEN verb = 'CLICKED' THEN 1 ELSE 0 END) as clicked_events,
        SUM(CASE WHEN verb = 'ENTERED' THEN 1 ELSE 0 END) as entered_events
      FROM actions
      WHERE 
        created_at >= ? AND created_at < ?
        AND object_type IN ('StoryFragment', 'Pane')
      GROUP BY hour_key, object_id, object_type
    `,
    args: [startTime.toISOString(), endTime.toISOString()],
  });

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
      )
      SELECT
        hour_key,
        COUNT(DISTINCT visit_id) as total_visits,
        GROUP_CONCAT(DISTINCT CASE WHEN lead_id IS NULL THEN fingerprint_id ELSE NULL END) as anonymous_fingerprints,
        GROUP_CONCAT(DISTINCT CASE WHEN lead_id IS NOT NULL THEN fingerprint_id ELSE NULL END) as known_fingerprints,
        (SELECT COUNT(*) FROM actions a WHERE a.verb = 'CLICKED' AND strftime('%Y-%m-%d-%H', a.created_at) = visit_fingerprints.hour_key) as clicked_events,
        (SELECT COUNT(*) FROM actions a WHERE a.verb = 'ENTERED' AND strftime('%Y-%m-%d-%H', a.created_at) = visit_fingerprints.hour_key) as entered_events
      FROM visit_fingerprints
      GROUP BY hour_key
    `,
    args: [startTime.toISOString(), endTime.toISOString()],
  });

  const { rows: storyFragmentRows } = await client.execute(`
    SELECT id, slug FROM storyfragments
  `);

  const slugMap = new Map<string, string>();
  const siteData: Record<string, ReturnType<typeof createEmptyHourlySiteData>> = {};
  const contentData: Record<string, Record<string, any>> = {};

  for (const hourKey of hourKeys) {
    siteData[hourKey] = createEmptyHourlySiteData();
  }

  // Process site data
  for (const row of siteRows as unknown as SiteRow[]) {
    const anonymousFingerprints = row.anonymous_fingerprints
      ? String(row.anonymous_fingerprints).split(",").filter(Boolean)
      : [];
    const knownFingerprints = row.known_fingerprints
      ? String(row.known_fingerprints).split(",").filter(Boolean)
      : [];

    siteData[row.hour_key] = {
      totalVisits: Number(row.total_visits || 0),
      anonymousVisitors: new Set(anonymousFingerprints),
      knownVisitors: new Set(knownFingerprints),
      clickedEvents: Number(row.clicked_events || 0),
      enteredEvents: Number(row.entered_events || 0),
    };
  }

  // Process content data
  for (const row of contentRows as unknown as ActionRow[]) {
    if (!row.object_id) continue;

    const contentId = String(row.object_id);
    if (!contentData[contentId]) {
      contentData[contentId] = {};
    }

    const fingerprints = row.fingerprints
      ? String(row.fingerprints).split(",").filter(Boolean)
      : [];
    const knownFingerprints = fingerprints.filter((id) =>
      siteData[row.hour_key]?.knownVisitors.has(id)
    );
    const anonymousFingerprints = fingerprints.filter((id) =>
      siteData[row.hour_key]?.anonymousVisitors.has(id)
    );

    contentData[contentId][row.hour_key] = {
      uniqueVisitors: new Set(fingerprints),
      knownVisitors: new Set(knownFingerprints),
      anonymousVisitors: new Set(anonymousFingerprints),
      actions: Number(row.total_actions || 0),
      clickedEvents: Number(row.clicked_events || 0),
      enteredEvents: Number(row.entered_events || 0),
    };
  }

  // Process story fragments
  for (const row of storyFragmentRows) {
    if (row.id && row.slug) {
      slugMap.set(String(row.slug), String(row.id));
    }
  }

  // Update store
  const currentHour = formatHourKey(new Date());
  hourlyAnalyticsStore.set({
    contentData,
    siteData,
    lastFullHour: currentHour,
    lastUpdated: Date.now(),
    totalLeads,
    lastActivity,
    slugMap,
  });
}

/**
 * Refreshes hourly analytics data, only fetching new hours since last update
 */
export async function refreshHourlyAnalytics(context?: APIContext): Promise<void> {
  const { lastFullHour } = hourlyAnalyticsStore.get();
  const currentHour = formatHourKey(new Date());

  if (lastFullHour === currentHour) {
    return;
  }

  const hoursSinceLastUpdate = lastFullHour
    ? Math.max(1, getHoursBetween(lastFullHour, currentHour))
    : 672;

  await loadHourlyAnalytics(hoursSinceLastUpdate, context);
}
