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
import type { APIContext, FullContentMap } from "@/types";

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

export async function loadHourlyAnalytics(
  hours: number = 672,
  context?: APIContext
): Promise<void> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const client = await tursoClient.getClient(context);
  if (!client) {
    return;
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

  let startTime: Date, endTime: Date;
  try {
    startTime = parseHourKeyToDate(hourKeys[hours - 1]);
    endTime = parseHourKeyToDate(hourKeys[0]);
    endTime.setHours(endTime.getHours() + 1);
  } catch (error) {
    console.debug("loadHourlyAnalytics: Error parsing hour keys", { error });
    throw error;
  }

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
      startTime.toISOString(),
      endTime.toISOString(),
      startTime.toISOString(),
      endTime.toISOString(),
    ],
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
      startTime.toISOString(),
      endTime.toISOString(),
      startTime.toISOString(),
      endTime.toISOString(),
    ],
  });

  const contentMap = await getFullContentMap(context);
  const slugMap = new Map<string, string>();
  const siteData: Record<string, ReturnType<typeof createEmptyHourlySiteData>> = {};
  const contentData: Record<string, Record<string, any>> = {};

  // Build slugMap from contentMap
  contentMap.forEach((item: FullContentMap) => {
    if (item.type === "StoryFragment" && item.id && item.slug) {
      slugMap.set(item.slug, item.id);
    }
  });

  for (const hourKey of hourKeys) {
    siteData[hourKey] = createEmptyHourlySiteData();
  }

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
}

export async function refreshHourlyAnalytics(context?: APIContext): Promise<void> {
  const tenantId = context?.locals?.tenant?.id || "default";
  const currentStore = hourlyAnalyticsStore.get();
  const lastFullHour = currentStore.data[tenantId]?.lastFullHour || "";
  const currentHour = formatHourKey(new Date());

  // If we need a full analytics refresh
  const hoursSinceLastUpdate = lastFullHour
    ? Math.max(1, getHoursBetween(lastFullHour, currentHour))
    : 672;

  await loadHourlyAnalytics(hoursSinceLastUpdate, context);
}
