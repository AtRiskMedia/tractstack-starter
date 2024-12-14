/* eslint-disable @typescript-eslint/no-explicit-any */
import { tursoClient } from "../client";
import type { ProcessedAnalytics } from "../../../types";

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

export async function getAnalytics(
  id: string,
  type: string,
  duration: string = "weekly"
): Promise<ProcessedAnalytics | null> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;

    const dateFilter = getDateFilter(duration);
    const intervalExpression = duration === "daily" ? "hour" : "day";
    const limit = duration === "daily" ? 24 : duration === "weekly" ? 7 : 28;

    let pieQuery, lineQuery;

    if (type === "storyfragment") {
      pieQuery = {
        sql: `
          WITH storyfragment AS (
            SELECT id, object_id, object_name
            FROM corpus
            WHERE object_type = 'StoryFragment' AND object_id = ?
          ),
          storyfragment_actions AS (
            SELECT 
              sf.id,
              sf.object_id,
              sf.object_name,
              'StoryFragment' AS object_type,
              a.verb,
              COUNT(a.id) AS verb_count
            FROM storyfragment sf
            LEFT JOIN actions a ON sf.id = a.object_id
            WHERE a.created_at >= ${dateFilter}
            GROUP BY sf.id, sf.object_id, sf.object_name, a.verb
          ),
          pane_actions AS (
            SELECT
              c.id,
              c.object_id,
              c.object_name,
              'Pane' AS object_type,
              a.verb,
              COUNT(a.id) AS verb_count
            FROM actions a
            JOIN corpus c ON a.object_id = c.id
            WHERE a.parent_id = (SELECT id FROM storyfragment)
            AND c.object_type = 'Pane'
            AND a.created_at >= ${dateFilter}
            GROUP BY c.id, c.object_id, c.object_name, a.verb
          )
          SELECT * FROM storyfragment_actions
          UNION ALL
          SELECT * FROM pane_actions
          ORDER BY object_type DESC, id, verb_count DESC
        `,
        args: [id],
      };

      lineQuery = {
        sql: `
          WITH storyfragment AS (
            SELECT id, object_id, object_name
            FROM corpus
            WHERE object_type = 'StoryFragment' AND object_id = ?
          ),
          intervals(interval_num) AS (
            SELECT 0
            UNION ALL
            SELECT interval_num + 1
            FROM intervals
            WHERE interval_num < ?
          ),
          storyfragment_actions AS (
            SELECT
              sf.id,
              sf.object_id,
              sf.object_name,
              'StoryFragment' AS object_type,
              a.verb,
              CAST((JULIANDAY('now') - JULIANDAY(a.created_at)) * CASE ? WHEN 'hour' THEN 24 ELSE 1 END AS INTEGER) AS time_interval,
              COUNT(a.id) AS total_count
            FROM storyfragment sf
            LEFT JOIN actions a ON sf.id = a.object_id
            WHERE a.created_at >= ${dateFilter}
            GROUP BY sf.id, sf.object_id, sf.object_name, a.verb, time_interval
          ),
          pane_actions AS (
            SELECT
              c.id,
              c.object_id,
              c.object_name,
              'Pane' AS object_type,
              a.verb,
              CAST((JULIANDAY('now') - JULIANDAY(a.created_at)) * CASE ? WHEN 'hour' THEN 24 ELSE 1 END AS INTEGER) AS time_interval,
              COUNT(a.id) AS total_count
            FROM actions a
            JOIN corpus c ON a.object_id = c.id
            WHERE a.parent_id = (SELECT id FROM storyfragment)
            AND c.object_type = 'Pane'
            AND a.created_at >= ${dateFilter}
            GROUP BY c.id, c.object_id, c.object_name, a.verb, time_interval
          )
          SELECT * FROM storyfragment_actions
          UNION ALL
          SELECT * FROM pane_actions
          ORDER BY object_type DESC, id, verb, time_interval
        `,
        args: [id, limit, intervalExpression, intervalExpression],
      };
    } else if (type === "pane") {
      pieQuery = {
        sql: `
          SELECT
            c.id,
            c.object_id,
            c.object_name,
            'Pane' AS object_type,
            a.verb,
            COUNT(a.id) AS verb_count
          FROM corpus c
          LEFT JOIN actions a ON c.id = a.object_id
          WHERE c.object_type = 'Pane' 
          AND c.object_id = ?
          AND a.created_at >= ${dateFilter}
          GROUP BY c.id, c.object_id, c.object_name, a.verb
          ORDER BY verb_count DESC
        `,
        args: [id],
      };

      lineQuery = {
        sql: `
          WITH intervals(interval_num) AS (
            SELECT 0
            UNION ALL
            SELECT interval_num + 1
            FROM intervals
            WHERE interval_num < ?
          )
          SELECT
            c.id,
            c.object_id,
            c.object_name,
            'Pane' AS object_type,
            a.verb,
            CAST((JULIANDAY('now') - JULIANDAY(a.created_at)) * CASE ? WHEN 'hour' THEN 24 ELSE 1 END AS INTEGER) AS time_interval,
            COUNT(a.id) AS total_count
          FROM corpus c
          LEFT JOIN actions a ON c.id = a.object_id
          WHERE c.object_type = 'Pane' 
          AND c.object_id = ?
          AND a.created_at >= ${dateFilter}
          GROUP BY c.id, c.object_id, c.object_name, a.verb, time_interval
          ORDER BY a.verb, time_interval
        `,
        args: [limit, intervalExpression, id],
      };
    } else {
      throw new Error("Invalid type specified");
    }

    const [pieResults, lineResults] = await Promise.all([
      client.execute(pieQuery),
      client.execute(lineQuery),
    ]);

    // Process pie chart data
    const pieData = pieResults.rows.reduce((acc: any[], row: any) => {
      if (!row.verb) return acc;
      acc.push({
        id: row.verb,
        value: Number(row.verb_count),
      });
      return acc;
    }, []);

    // Process line chart data
    const lineData = lineResults.rows.reduce((acc: Map<string, any>, row: any) => {
      if (!row.verb) return acc;
      if (!acc.has(row.verb)) {
        acc.set(row.verb, {
          id: row.verb,
          data: [],
        });
      }
      acc.get(row.verb).data.push({
        x: Number(row.time_interval),
        y: Number(row.total_count),
      });
      return acc;
    }, new Map());

    // Fill missing intervals with zeros
    lineData.forEach((series) => {
      const existingIntervals = new Set(series.data.map((d: any) => d.x));
      for (let i = 0; i < limit; i++) {
        if (!existingIntervals.has(i)) {
          series.data.push({ x: i, y: 0 });
        }
      }
      series.data.sort((a: any, b: any) => a.x - b.x);
    });

    const result = {
      pie: pieData,
      line: Array.from(lineData.values()),
    };

    return result;
  } catch (error) {
    console.error("Error getting analytics:", error);
    throw error;
  }
}
