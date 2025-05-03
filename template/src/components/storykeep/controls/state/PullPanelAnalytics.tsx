import { useEffect, useState, useCallback } from "react";
import { useStore } from "@nanostores/react";
import {
  analyticsDuration,
  analyticsStore,
  storedAnalytics,
  showAnalytics,
  panelAnalyticsCache,
} from "@/store/storykeep";

// Cache expiration time in ms (1 hour)
const CACHE_EXPIRATION_MS = 60 * 60 * 1000;

type PullPanelAnalyticsProps = {
  id: string;
  type?: "pane" | "storyfragment";
};

export const PullPanelAnalytics = ({ id, type = "storyfragment" }: PullPanelAnalyticsProps) => {
  const $analyticsDuration = useStore(analyticsDuration);
  const duration = $analyticsDuration;
  const $showAnalytics = useStore(showAnalytics);
  const $panelAnalyticsCache = useStore(panelAnalyticsCache);
  const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null);

  // Clear any existing polling timer when component unmounts
  useEffect(() => {
    return () => {
      if (pollingTimer) {
        clearTimeout(pollingTimer);
      }
    };
  }, [pollingTimer]);

  // Determine if we need to fetch data based on cache state
  const shouldFetchData = useCallback(() => {
    if (!$showAnalytics) return false;

    // Different ID than what's in cache - need fresh data
    if ($panelAnalyticsCache.id !== id || $panelAnalyticsCache.type !== type) {
      return true;
    }

    // Check if we have data for the current duration
    const cachedData = $panelAnalyticsCache.data[duration];
    if (!cachedData) {
      return true;
    }

    // Check if cache is expired (older than 1 hour)
    if ($panelAnalyticsCache.lastFetched) {
      const cacheAge = Date.now() - $panelAnalyticsCache.lastFetched;
      if (cacheAge > CACHE_EXPIRATION_MS) {
        return true;
      }
    }

    return false;
  }, [$showAnalytics, $panelAnalyticsCache, id, type, duration]);

  // Fetch analytics data when needed
  useEffect(() => {
    // Only fetch if analytics are visible and we need fresh data
    if (shouldFetchData()) {
      fetchAnalytics();
    } else if (
      $showAnalytics &&
      $panelAnalyticsCache.id === id &&
      $panelAnalyticsCache.type === type
    ) {
      // If we have cached data for this ID and duration, use it
      const cachedData = $panelAnalyticsCache.data[duration];
      if (cachedData) {
        storedAnalytics.setKey(id, cachedData);
        analyticsStore.setKey("status", "complete");
        analyticsStore.setKey("lastUpdated", Date.now());
        analyticsStore.setKey("error", null);
      }
    }
  }, [$showAnalytics, duration, id, type, shouldFetchData]);

  const fetchAnalytics = useCallback(async () => {
    try {
      // Update loading state
      analyticsStore.setKey("isLoading", true);

      // Clear any existing timer before making a new request
      if (pollingTimer) {
        clearTimeout(pollingTimer);
        setPollingTimer(null);
      }

      // Make the API request to the new endpoint
      const response = await fetch(
        `/api/turso/getPanelAnalytics?id=${id}&type=${type}&duration=${duration}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Store the analytics data
        if (result.data) {
          // Update the cache
          const currentCache = panelAnalyticsCache.get();

          // If ID has changed, reset all durations
          if (currentCache.id !== id || currentCache.type !== type) {
            panelAnalyticsCache.set({
              id,
              type,
              data: {
                daily: null,
                weekly: null,
                monthly: null,
                [duration]: result.data,
              },
              lastFetched: Date.now(),
            });
          } else {
            // Just update this duration's data
            panelAnalyticsCache.set({
              ...currentCache,
              data: {
                ...currentCache.data,
                [duration]: result.data,
              },
              lastFetched: Date.now(),
            });
          }

          // Update the store for the UI
          storedAnalytics.setKey(id, result.data);
        }

        // Update status
        analyticsStore.setKey("status", result.status || "complete");
        analyticsStore.setKey("lastUpdated", Date.now());
        analyticsStore.setKey("error", null);

        // Only schedule polling if data is still loading and analytics are visible
        if (result.status === "loading" && $showAnalytics) {
          const timer = setTimeout(() => fetchAnalytics(), 5000); // Poll every 5 seconds
          setPollingTimer(timer);
        }
      } else {
        // Handle API error
        analyticsStore.setKey("error", result.error || "Unknown API error");
        analyticsStore.setKey("status", "error");

        // Schedule retry after error only if analytics are visible
        if ($showAnalytics) {
          const timer = setTimeout(() => fetchAnalytics(), 10000); // Retry after 10 seconds
          setPollingTimer(timer);
        }
      }
    } catch (error) {
      // Handle fetch error
      console.error("Error fetching analytics data:", error);
      analyticsStore.setKey("error", error instanceof Error ? error.message : "Unknown error");
      analyticsStore.setKey("status", "error");

      // Schedule retry after error only if analytics are visible
      if ($showAnalytics) {
        const timer = setTimeout(() => fetchAnalytics(), 10000); // Retry after 10 seconds
        setPollingTimer(timer);
      }
    } finally {
      // Always update loading state when done
      analyticsStore.setKey("isLoading", false);
    }
  }, [duration, id, type, pollingTimer, $showAnalytics]);

  // Stop polling when analytics are hidden
  useEffect(() => {
    if (!$showAnalytics && pollingTimer) {
      clearTimeout(pollingTimer);
      setPollingTimer(null);
    }
  }, [$showAnalytics, pollingTimer]);

  return null;
};

export default PullPanelAnalytics;
