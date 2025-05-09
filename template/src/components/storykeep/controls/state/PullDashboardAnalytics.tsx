import { useEffect, useState, useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
import { analyticsDuration, analyticsStore, epinetCustomFilters } from "@/store/storykeep";
import { debounce } from "@/utils/common/helpers";

export const PullDashboardAnalytics = () => {
  const $analyticsDuration = useStore(analyticsDuration);
  const $epinetCustomFilters = useStore(epinetCustomFilters);
  const duration = $analyticsDuration;
  const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [customFetchInProgress, setCustomFetchInProgress] = useState(false);
  const previousEnabledRef = useRef<boolean>($epinetCustomFilters.enabled);

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
    if (!$epinetCustomFilters.enabled) {
      fetchAllAnalytics();
    }
  }, [duration, $epinetCustomFilters.enabled]);

  // Make sure we poll at least once on initial mount
  useEffect(() => {
    if (!initialFetchDone) {
      fetchAllAnalytics();
      setInitialFetchDone(true);
    }
  }, [initialFetchDone]);

  // Handle custom filter toggle: refresh standard data when toggling off custom view
  useEffect(() => {
    const wasEnabled = previousEnabledRef.current;
    previousEnabledRef.current = $epinetCustomFilters.enabled;

    if (wasEnabled && !$epinetCustomFilters.enabled) {
      // User switched from custom filters back to standard view
      fetchAllAnalytics();
    }
  }, [$epinetCustomFilters.enabled]);

  // Handle custom filter changes
  useEffect(() => {
    if (!$epinetCustomFilters.enabled) return;

    // Check if we have valid filter criteria
    const hasValidFilters =
      $epinetCustomFilters.visitorType !== null &&
      $epinetCustomFilters.startHour !== null &&
      $epinetCustomFilters.endHour !== null;

    if (hasValidFilters) {
      debouncedFetchCustomEpinetData();
    }
  }, [
    $epinetCustomFilters.enabled,
    $epinetCustomFilters.visitorType,
    $epinetCustomFilters.selectedUserId,
    $epinetCustomFilters.startHour,
    $epinetCustomFilters.endHour,
  ]);

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

        // Only update epinet data if custom filters are disabled
        if (!$epinetCustomFilters.enabled) {
          analyticsStore.setKey("epinet", result.data.epinet);
        }

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
  }, [duration, pollingTimer, $epinetCustomFilters.enabled]);

  const fetchCustomEpinetData = useCallback(async () => {
    // Don't fetch if custom filters are disabled or already fetching
    if (!$epinetCustomFilters.enabled || customFetchInProgress) {
      return;
    }

    try {
      setCustomFetchInProgress(true);
      analyticsStore.setKey("isLoading", true);

      // Get the epinet ID from the promoted epinets data
      // Use any existing ID from analytics store or fetch it from a separate endpoint if needed
      const currentEpinet = analyticsStore.get().epinet;

      // Find the ID - in the existing structure this might be at the root level
      // Try to extract it safely based on actual structure
      let epinetId = "unknown";
      if (currentEpinet && typeof currentEpinet === "object") {
        // Try common patterns of how ID might be stored
        epinetId =
          // @ts-ignore - we're being defensive against structure variations
          currentEpinet.id ||
          // @ts-ignore
          (currentEpinet.nodes && currentEpinet.nodes[0]?.id) ||
          "unknown";
      }

      // Build URL with custom filter parameters
      const url = new URL(`/api/turso/getEpinetCustomMetrics`, window.location.origin);
      url.searchParams.append("id", epinetId);
      url.searchParams.append("visitorType", $epinetCustomFilters.visitorType);

      if ($epinetCustomFilters.selectedUserId) {
        url.searchParams.append("userId", $epinetCustomFilters.selectedUserId);
      }

      if ($epinetCustomFilters.startHour !== null) {
        url.searchParams.append("startHour", $epinetCustomFilters.startHour.toString());
      }

      if ($epinetCustomFilters.endHour !== null) {
        url.searchParams.append("endHour", $epinetCustomFilters.endHour.toString());
      }

      // Make the API request
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Custom epinet metrics request failed with status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Update epinet data with filtered results
        analyticsStore.setKey("epinet", result.data.epinet);

        // Update available visitor IDs in the filter store - respecting the atom pattern
        epinetCustomFilters.set({
          ...$epinetCustomFilters,
          availableVisitorIds: result.data.availableVisitorIds || [],
        });

        analyticsStore.setKey("status", "complete");
        analyticsStore.setKey("lastUpdated", Date.now());
        analyticsStore.setKey("error", null);
      } else {
        analyticsStore.setKey("error", result.error || "Failed to fetch custom epinet data");
        analyticsStore.setKey("status", "error");
      }
    } catch (error) {
      console.error("Error fetching custom epinet data:", error);
      analyticsStore.setKey("error", error instanceof Error ? error.message : "Unknown error");
      analyticsStore.setKey("status", "error");
    } finally {
      setCustomFetchInProgress(false);
      analyticsStore.setKey("isLoading", false);
    }
  }, [$epinetCustomFilters, customFetchInProgress]);

  // Create debounced version of fetchCustomEpinetData to avoid rapid re-fetching
  const debouncedFetchCustomEpinetData = useCallback(debounce(fetchCustomEpinetData, 500), [
    fetchCustomEpinetData,
  ]);

  return null;
};

export default PullDashboardAnalytics;
