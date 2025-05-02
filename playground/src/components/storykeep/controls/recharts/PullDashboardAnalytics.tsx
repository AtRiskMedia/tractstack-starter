import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { storedDashboardAnalytics, analyticsDuration } from "@/store/storykeep.ts";

export const PullDashboardAnalytics = () => {
  const $analyticsDuration = useStore(analyticsDuration);
  const duration = $analyticsDuration;

  useEffect(() => {
    fetchDashboardAnalytics();
  }, [duration]);

  async function fetchDashboardAnalytics() {
    try {
      const response = await fetch(`/api/turso/getDashboardAnalytics?duration=${duration}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (data.success) {
        storedDashboardAnalytics.set(data.data);

        // If data is still loading/refreshing, set up polling
        if (data.status === "loading" || data.status === "refreshing") {
          setTimeout(() => fetchDashboardAnalytics(), 5000); // Poll every 5 seconds
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard analytics data:", error);
    }
  }

  return null;
};

export default PullDashboardAnalytics;
