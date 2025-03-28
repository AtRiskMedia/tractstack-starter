/* eslint-disable @typescript-eslint/no-explicit-any */
import { tursoClient } from "../client";
import type { DashboardAnalytics } from "@/types";
import type { APIContext } from "@/types";

export async function dashboardAnalytics(
  duration: string = "weekly",
  context?: APIContext
): Promise<DashboardAnalytics> {
  const client = await tursoClient.getClient(context);
  if (!client) {
    throw new Error("Database connection failed");
  }

  function getDateFilter(duration: string): string {
    switch (duration) {
      case "daily":
        return "datetime('now', '-1 day')";
      case "weekly":
        return "datetime('now', '-7 days')";
      case "monthly":
      default:
        return "datetime('now', '-28 days')";
    }
  }

  const statsQuery = {
    sql: `
     SELECT
       SUM(CASE WHEN created_at >= datetime('now', '-1 day') THEN 1 ELSE 0 END) as daily,
       SUM(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as weekly,
       SUM(CASE WHEN created_at >= datetime('now', '-28 days') THEN 1 ELSE 0 END) as monthly
     FROM actions
     WHERE verb = 'PAGEVIEWED'
   `,
    args: [],
  };
  const { rows: statsRows } = await client.execute(statsQuery);

  const timeInterval = duration === "daily" ? "hour" : "day";
  const intervalLimit = duration === "daily" ? 24 : duration === "weekly" ? 7 : 28;

  const lineQuery = {
    sql: `
     WITH RECURSIVE
     intervals(interval_num) AS (
       SELECT 0
       UNION ALL
       SELECT interval_num + 1
       FROM intervals
       WHERE interval_num < ?
     ),
     interval_counts AS (
       SELECT 
         verb,
         CAST(
           (
             JULIANDAY('now') - 
             JULIANDAY(created_at)
           ) * CASE ? 
             WHEN 'hour' THEN 24 
             ELSE 1 
           END AS INTEGER
         ) as time_interval,
         COUNT(*) as event_count
       FROM actions
       WHERE created_at >= ${getDateFilter(duration)}
       GROUP BY verb, time_interval
     )
     SELECT 
       i.interval_num as time_interval,
       COALESCE(ic.verb, 'NONE') as verb,
       COALESCE(ic.event_count, 0) as total_count
     FROM intervals i
     LEFT JOIN interval_counts ic ON i.interval_num = ic.time_interval
     ORDER BY verb, time_interval
   `,
    args: [intervalLimit, timeInterval],
  };
  const { rows: lineRows } = await client.execute(lineQuery);

  const hotQuery = {
    sql: `
     SELECT 
       object_id as id,
       object_type as type,
       COUNT(*) as total_events
     FROM actions 
     WHERE 
       (object_type = 'StoryFragment' OR object_type = 'Pane')
       AND created_at >= ${getDateFilter(duration)}
     GROUP BY object_id, object_type
     ORDER BY total_events DESC
     LIMIT 10
   `,
    args: [],
  };
  const { rows: hotRows } = await client.execute(hotQuery);

  const stats = {
    daily: Number(statsRows[0]?.daily || 0),
    weekly: Number(statsRows[0]?.weekly || 0),
    monthly: Number(statsRows[0]?.monthly || 0),
  };

  const lineData = new Map<string, { id: string; data: { x: number; y: number }[] }>();

  lineRows.forEach((row: any) => {
    const verb = row.verb;
    if (verb === "NONE") return;

    if (!lineData.has(verb)) {
      lineData.set(verb, {
        id: verb,
        data: Array(intervalLimit)
          .fill(0)
          .map((_, i) => ({ x: i, y: 0 })),
      });
    }

    const verbData = lineData.get(verb)!;
    const timeInterval = Number(row.time_interval);
    if (timeInterval < intervalLimit) {
      verbData.data[timeInterval].y = Number(row.total_count);
    }
  });

  const hotContent = hotRows.map((row: any) => ({
    id: row.id,
    type: row.type,
    total_events: Number(row.total_events),
  }));

  return {
    stats,
    line: Array.from(lineData.values()),
    hot_content: hotContent,
  };
}
