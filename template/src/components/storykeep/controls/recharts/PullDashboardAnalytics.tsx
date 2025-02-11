import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { storedDashboardAnalytics, analyticsDuration } from "@/store/storykeep.ts";
import type { DashboardAnalytics, LineDataSeries, HotItem } from "@/types.ts";

export const PullDashboardAnalytics = () => {
  const $analyticsDuration = useStore(analyticsDuration);
  const duration = $analyticsDuration;

  useEffect(() => {
    fetchDashboardAnalytics();
  }, [duration]);

  async function fetchDashboardAnalytics() {
    try {
      const response = await fetch("/api/turso/dashboardAnalytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ duration }),
      });

      const data = await response.json();
      if (data.success) {
        storedDashboardAnalytics.set(processDashboardAnalytics(data.data));
      }
    } catch (error) {
      console.error("Error fetching dashboard analytics data:", error);
    }
  }

  function processDashboardAnalytics(data: {
    stats: { daily: number; weekly: number; monthly: number };
    line: LineDataSeries[];
    hot_panes: { id: string; total_events: number }[];
    hot_content: { id: string; total_events: number }[];
  }): DashboardAnalytics {
    return {
      stats: {
        daily: data.stats.daily,
        weekly: data.stats.weekly,
        monthly: data.stats.monthly,
      },
      line: data.line,
      hot_content: data.hot_content.map(
        (item): HotItem => ({
          id: item.id,
          total_events: item.total_events,
        })
      ),
    };
  }

  return null;
};

export default PullDashboardAnalytics;
