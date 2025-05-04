import { useEffect, useState, useCallback } from "react";
import { useStore } from "@nanostores/react";
import { analyticsDuration, analyticsStore } from "@/store/storykeep";

export const PullDashboardAnalytics = () => {
  const $analyticsDuration = useStore(analyticsDuration);
  const duration = $analyticsDuration;
  const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  // Clear any existing polling timer when component unmounts
  useEffect(() => {
    return () => {
      if (pollingTimer) {
        clearTimeout(pollingTimer);
      }
    };
  }, [pollingTimer]);

  // Fetch all analytics data when duration changes or on initial mount
  useEffect(() => {
    fetchAllAnalytics();
  }, [duration]);

  // Make sure we poll at least once on initial mount
  useEffect(() => {
    if (!initialFetchDone) {
      fetchAllAnalytics();
      setInitialFetchDone(true);
    }
  }, [initialFetchDone]);

  const fetchAllAnalytics = useCallback(async () => {
    try {
      // Update loading state
      analyticsStore.setKey("isLoading", true);

      // Clear any existing timer before making a new request
      if (pollingTimer) {
        clearTimeout(pollingTimer);
        setPollingTimer(null);
      }

      // Make the API request
      const response = await fetch(`/api/turso/getAllAnalytics?duration=${duration}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Update the analytics store with the response data
        analyticsStore.setKey("dashboard", result.data.dashboard);
        analyticsStore.setKey("leads", result.data.leads);
        analyticsStore.setKey("epinet", result.data.epinet);
        analyticsStore.setKey("status", result.status);
        analyticsStore.setKey("lastUpdated", Date.now());
        analyticsStore.setKey("error", null);

        // Schedule polling if data is still loading or refreshing
        if (result.status === "loading" || result.status === "refreshing") {
          const timer = setTimeout(() => fetchAllAnalytics(), 5000); // Poll every 5 seconds
          setPollingTimer(timer);
        }
      } else {
        // Handle API error
        analyticsStore.setKey("error", result.error || "Unknown API error");
        analyticsStore.setKey("status", "error");

        // Schedule retry after error
        const timer = setTimeout(() => fetchAllAnalytics(), 10000); // Retry after 10 seconds
        setPollingTimer(timer);
      }
    } catch (error) {
      // Handle fetch error
      console.error("Error fetching analytics data:", error);
      analyticsStore.setKey("error", error instanceof Error ? error.message : "Unknown error");
      analyticsStore.setKey("status", "error");

      // Schedule retry after error
      const timer = setTimeout(() => fetchAllAnalytics(), 10000); // Retry after 10 seconds
      setPollingTimer(timer);
    } finally {
      // Always update loading state when done
      analyticsStore.setKey("isLoading", false);
    }
  }, [duration, pollingTimer]);

  return null;
};

export default PullDashboardAnalytics;
