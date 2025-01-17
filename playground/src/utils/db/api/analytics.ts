import { tursoClient } from "../client";
import type { LineDataSeries, LineDataPoint, PieDataItem, RawAnalytics } from "@/types.ts";

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

const isPieDataItem = (verb: PieDataItem | LineDataSeries): verb is PieDataItem => {
  return "value" in verb;
};

const isLineDataSeries = (verb: PieDataItem | LineDataSeries): verb is LineDataSeries => {
  return "data" in verb;
};

function mergePaneDataIntoStoryFragment(data: RawAnalytics): RawAnalytics {
  const result: RawAnalytics = {
    pie: [...data.pie],
    line: [...data.line],
  };

  const storyFragment = data.pie.find((item) => item.object_type === "StoryFragment");
  const lineStoryFragment = data.line.find((item) => item.object_type === "StoryFragment");

  if (storyFragment) {
    data.pie.forEach((item) => {
      if (item.object_type === "Pane") {
        item.verbs.forEach((verb: any) => {
          const existingVerb = storyFragment.verbs.find((v: any) => v.id === verb.id);
          if (existingVerb && isPieDataItem(existingVerb) && isPieDataItem(verb)) {
            existingVerb.value += verb.value;
          } else {
            storyFragment.verbs.push({ ...verb });
          }
        });
        storyFragment.total_actions += item.total_actions;
      }
    });
  }

  if (lineStoryFragment) {
    data.line.forEach((item) => {
      if (item.object_type === "Pane") {
        item.verbs.forEach((verb: any) => {
          const existingVerb = lineStoryFragment.verbs.find((v: any) => v.id === verb.id);
          if (existingVerb && isLineDataSeries(verb)) {
            verb.data.forEach((d: LineDataPoint) => {
              if (isLineDataSeries(existingVerb)) {
                const dataPoint = existingVerb.data.find((dp: LineDataPoint) => dp.x === d.x);
                if (dataPoint) {
                  dataPoint.y += d.y;
                }
              }
            });
            lineStoryFragment.total_actions += item.total_actions;
          } else {
            lineStoryFragment.verbs.push({ ...verb });
          }
        });
      }
    });
  }

  return result;
}

export async function getAnalytics(
  id: string,
  type: string,
  duration: string = "weekly"
): Promise<RawAnalytics | null> {
  try {
    const client = await tursoClient.getClient();
    if (!client) return null;

    const dateFilter = getDateFilter(duration);
    const intervalExpression = duration === "daily" ? "hour" : "day";
    const limit = duration === "daily" ? 24 : duration === "weekly" ? 7 : 28;

    const pieQuery = {
      sql: `
    SELECT
      c.object_id,
      c.object_name,
      c.object_type,
      a.verb,
      COUNT(a.id) AS verb_count
    FROM corpus c
    JOIN actions a ON c.id = a.object_id
    WHERE (
      (c.object_id = ? AND c.object_type = 'StoryFragment') OR
      (c.object_type = 'Pane' AND EXISTS (
        SELECT 1 FROM storyfragment_pane sp 
        WHERE sp.storyfragment_id = ? 
        AND sp.pane_id = c.object_id
      ))
    )
    AND a.created_at >= ${dateFilter}
    GROUP BY c.object_id, c.object_name, c.object_type, a.verb
    ORDER BY c.object_type DESC, verb_count DESC
  `,
      args: [id, id],
    };

    const lineQuery = {
      sql: `
    WITH intervals(interval_num) AS (
      SELECT 0
      UNION ALL
      SELECT interval_num + 1
      FROM intervals
      WHERE interval_num < ?
    )
    SELECT
      c.object_id,
      c.object_name,
      c.object_type,
      a.verb,
      CAST((JULIANDAY('now') - JULIANDAY(a.created_at)) * CASE ? WHEN 'hour' THEN 24 ELSE 1 END AS INTEGER) AS time_interval,
      COUNT(a.id) AS total_count
    FROM corpus c
    JOIN actions a ON c.id = a.object_id
    WHERE (
      (c.object_id = ? AND c.object_type = 'StoryFragment') OR
      (c.object_type = 'Pane' AND EXISTS (
        SELECT 1 FROM storyfragment_pane sp 
        WHERE sp.storyfragment_id = ? 
        AND sp.pane_id = c.object_id
      ))
    )
    AND a.created_at >= ${dateFilter}
    GROUP BY c.object_id, c.object_name, c.object_type, a.verb, time_interval
    ORDER BY c.object_type DESC, verb, time_interval
  `,
      args: [limit, intervalExpression, id, id],
    };

    const [pieResults, lineResults] = await Promise.all([
      client.execute(pieQuery),
      client.execute(lineQuery),
    ]);

    // Group the results by object_id
    const analytics: RawAnalytics = {
      pie: [],
      line: [],
    };

    // Process pie data - one entry per object_id
    const pieByObject = pieResults.rows.reduce((acc: any, row: any) => {
      if (!acc[row.object_id]) {
        acc[row.object_id] = {
          id: Number(row.object_id),
          object_id: row.object_id,
          object_name: row.object_name,
          object_type: row.object_type,
          total_actions: 0,
          verbs: [],
        };
      }
      acc[row.object_id].verbs.push({
        id: row.verb,
        value: Number(row.verb_count),
      });
      acc[row.object_id].total_actions += Number(row.verb_count);
      return acc;
    }, {});
    analytics.pie = Object.values(pieByObject);

    // Process line data - one entry per object_id
    const lineByObject = lineResults.rows.reduce((acc: any, row: any) => {
      if (!acc[row.object_id]) {
        acc[row.object_id] = {
          id: Number(row.object_id),
          object_id: row.object_id,
          object_name: row.object_name,
          object_type: row.object_type,
          total_actions: 0,
          verbs: {},
        };
      }
      if (!acc[row.object_id].verbs[row.verb]) {
        acc[row.object_id].verbs[row.verb] = {
          id: row.verb,
          data: [],
        };
      }
      acc[row.object_id].verbs[row.verb].data.push({
        x: row.time_interval,
        y: Number(row.total_count),
      });
      acc[row.object_id].total_actions += Number(row.total_count);
      return acc;
    }, {});

    // Fill missing intervals with zeros
    Object.values(lineByObject).forEach((obj: any) => {
      Object.values(obj.verbs).forEach((series: any) => {
        const existingIntervals = new Set(series.data.map((d: any) => d.x));
        for (let i = 0; i < limit; i++) {
          if (!existingIntervals.has(i)) {
            series.data.push({ x: i, y: 0 });
          }
        }
        series.data.sort((a: any, b: any) => a.x - b.x);
      });
      obj.verbs = Object.values(obj.verbs);
    });
    analytics.line = Object.values(lineByObject);
    const processedData = mergePaneDataIntoStoryFragment(analytics);
    return processedData;
  } catch (error) {
    console.error("Error getting analytics:", error);
    throw error;
  }
}
