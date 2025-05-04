import { tursoClient } from "../client";
import type { LineDataSeries, LineDataPoint, ProcessedAnalytics } from "@/types.ts";
import type { APIContext } from "@/types";

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

/**
 * Get optimized analytics data for panel (pane or storyfragment)
 * Returns only line chart data without pie chart data for better performance
 */
export async function getPanelAnalytics(
  id: string,
  type: "pane" | "storyfragment",
  duration: string = "weekly",
  context?: APIContext
): Promise<ProcessedAnalytics | null> {
  try {
    const client = await tursoClient.getClient(context);
    if (!client) return null;

    const dateFilter = getDateFilter(duration);
    const intervalExpression = duration === "daily" ? "hour" : "day";
    const limit = duration === "daily" ? 24 : duration === "weekly" ? 7 : 28;

    let query;

    if (type === "pane") {
      query = {
        sql: `
        WITH RECURSIVE intervals(interval_num) AS (
          SELECT 0
          UNION ALL
          SELECT interval_num + 1
          FROM intervals
          WHERE interval_num < ?
        )
        SELECT
          verb,
          CAST((JULIANDAY('now', 'utc') - JULIANDAY(created_at)) * CASE ? WHEN 'hour' THEN 24 ELSE 1 END AS INTEGER) AS time_interval,
          COUNT(*) AS total_count
        FROM actions
        WHERE object_id = ? 
          AND object_type = 'Pane'
          AND created_at >= ${dateFilter}
        GROUP BY verb, time_interval
        ORDER BY verb, time_interval
        `,
        args: [limit, intervalExpression, id],
      };
    } else {
      query = {
        sql: `
        WITH RECURSIVE intervals(interval_num) AS (
          SELECT 0
          UNION ALL
          SELECT interval_num + 1
          FROM intervals
          WHERE interval_num < ?
        )
        SELECT
          verb,
          CAST((JULIANDAY('now', 'utc') - JULIANDAY(created_at)) * CASE ? WHEN 'hour' THEN 24 ELSE 1 END AS INTEGER) AS time_interval,
          COUNT(*) AS total_count
        FROM actions
        WHERE (
          (object_id = ? AND object_type = 'StoryFragment') OR
          (object_type = 'Pane' AND EXISTS (
            SELECT 1 FROM storyfragment_panes sp 
            WHERE sp.storyfragment_id = ? 
            AND sp.pane_id = object_id
          ))
        )
        AND created_at >= ${dateFilter}
        GROUP BY verb, time_interval
        ORDER BY verb, time_interval
        `,
        args: [limit, intervalExpression, id, id],
      };
    }

    const { rows } = await client.execute(query);

    // Process the data into series by verb
    const seriesByVerb: Record<string, LineDataPoint[]> = {};

    // Process each row into the appropriate series
    rows.forEach((row) => {
      const verb = String(row.verb);
      const timeInterval = Number(row.time_interval);
      const count = Number(row.total_count);

      if (!seriesByVerb[verb]) {
        seriesByVerb[verb] = [];
      }

      seriesByVerb[verb].push({
        x: timeInterval,
        y: count,
      });
    });

    // Make sure all series have points for all time intervals
    Object.values(seriesByVerb).forEach((series) => {
      const existingIntervals = new Set(series.map((d) => d.x));
      for (let i = 0; i < limit; i++) {
        if (!existingIntervals.has(i)) {
          series.push({ x: i, y: 0 });
        }
      }
      // Sort by time interval
      series.sort((a, b) => Number(a.x) - Number(b.x));
    });

    // Convert to the final format
    const lineSeries: LineDataSeries[] = Object.entries(seriesByVerb).map(([verb, data]) => ({
      id: verb,
      data,
    }));

    return {
      pie: [], // Empty array to maintain compatibility
      line: lineSeries,
    };
  } catch (error) {
    console.error("Error getting panel analytics:", error);
    return {
      pie: [], // Empty array to maintain compatibility
      line: [],
    };
  }
}
