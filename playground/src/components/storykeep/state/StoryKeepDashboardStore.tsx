import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { storedDashboardAnalytics, analyticsDuration } from "../../../store/storykeep";
import type { DashboardAnalytics, LineDataSeries, HotItem } from "../../../types";

export const StoryKeepDashboardStore = () => {
  const $analyticsDuration = useStore(analyticsDuration);
  const duration = $analyticsDuration;

  useEffect(() => {
    fetchDashboardAnalytics();
  }, [duration]);

  async function fetchDashboardAnalytics() {
    try {
      const response = await fetch(
        `/api/concierge/storykeep/dashboardAnalytics?duration=${encodeURIComponent(duration)}`
      );
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
    hot_story_fragments: { id: string; total_events: number }[];
  }): DashboardAnalytics {
    return {
      stats: {
        daily: data.stats.daily,
        weekly: data.stats.weekly,
        monthly: data.stats.monthly,
      },
      line: data.line,
      hot_story_fragments: data.hot_story_fragments.map(
        (item): HotItem => ({
          id: item.id,
          total_events: item.total_events,
        })
      ),
    };
  }

  return null;
};

export default StoryKeepDashboardStore;
