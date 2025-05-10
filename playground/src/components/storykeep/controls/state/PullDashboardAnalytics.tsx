import { useEffect, useState, useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
import { analyticsDuration, analyticsStore, epinetCustomFilters } from "@/store/storykeep";
import { contentMap } from "@/store/events";
import { debounce } from "@/utils/common/helpers";

export const PullDashboardAnalytics = () => {
  const $analyticsDuration = useStore(analyticsDuration);
  const $epinetCustomFilters = useStore(epinetCustomFilters);
  const $contentMap = useStore(contentMap);
  const duration = $analyticsDuration;
  const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [customFetchInProgress, setCustomFetchInProgress] = useState(false);
  const previousEnabledRef = useRef<boolean>($epinetCustomFilters.enabled);

  // Use a ref instead of state to track polling attempts across closures
  const pollingAttemptsRef = useRef<number>(0);
  const MAX_POLLING_ATTEMPTS = 3;

  // Progressive polling delays
  const POLLING_DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s

  // Clear any existing polling timer when component unmounts
  useEffect(() => {
    return () => {
      if (pollingTimer) {
        clearTimeout(pollingTimer);
      }
    };
  }, [pollingTimer]);

  // Initialize epinet custom filters based on duration (on mount and when duration changes)
  useEffect(() => {
    // Set hours based on duration
    let startHour;
    const endHour = 0; // Current hour

    if (duration === "daily") {
      startHour = 24;
    } else if (duration === "weekly") {
      startHour = 168;
    } else {
      // monthly
      startHour = 672;
    }

    // Always enable custom filters with the appropriate hours
    epinetCustomFilters.set({
      enabled: true,
      visitorType: "all",
      selectedUserId: null,
      startHour,
      endHour,
      availableVisitorIds: $epinetCustomFilters.availableVisitorIds || [],
    });
  }, [duration]);

  // Fetch all analytics data when duration changes or on initial mount
  useEffect(() => {
    if (!$epinetCustomFilters.enabled) {
      // Reset polling attempts counter when duration changes
      pollingAttemptsRef.current = 0;
      fetchAllAnalytics();
    }
  }, [duration, $epinetCustomFilters.enabled]);

  // Make sure we poll at least once on initial mount
  useEffect(() => {
    if (!initialFetchDone) {
      pollingAttemptsRef.current = 0;
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
      pollingAttemptsRef.current = 0;
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

  // Add effect to fetch epinet data when analytics are fetched or duration changes
  useEffect(() => {
    // Fetch epinet data regardless of custom filters status
    fetchEpinetData();
  }, [duration, analyticsStore.get().lastUpdated]);

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
        analyticsStore.setKey("status", result.status);
        analyticsStore.setKey("lastUpdated", Date.now());
        analyticsStore.setKey("error", null);

        if (result.status === "loading" || result.status === "refreshing") {
          // Check if we've reached the maximum attempts
          if (pollingAttemptsRef.current < MAX_POLLING_ATTEMPTS - 1) {
            // Get the appropriate delay based on current attempt
            const delayMs =
              POLLING_DELAYS[pollingAttemptsRef.current] ||
              POLLING_DELAYS[POLLING_DELAYS.length - 1];

            // Increment the attempt counter
            pollingAttemptsRef.current += 1;

            // Schedule next poll
            const newTimer = setTimeout(() => {
              fetchAllAnalytics();
            }, delayMs);

            setPollingTimer(newTimer);
          } else {
            analyticsStore.setKey("status", "complete");
            // Reset counter for future polling
            pollingAttemptsRef.current = 0;
          }
        } else {
          // If we get a non-loading status, reset the attempts counter
          pollingAttemptsRef.current = 0;
        }
      } else {
        // Handle API error
        analyticsStore.setKey("error", result.error || "Unknown API error");
        analyticsStore.setKey("status", "error");

        // Schedule retry after error, respecting the maximum attempts
        if (pollingAttemptsRef.current < MAX_POLLING_ATTEMPTS - 1) {
          const delayMs =
            POLLING_DELAYS[pollingAttemptsRef.current] || POLLING_DELAYS[POLLING_DELAYS.length - 1];
          pollingAttemptsRef.current += 1;
          const newTimer = setTimeout(() => fetchAllAnalytics(), delayMs);
          setPollingTimer(newTimer);
        } else {
          analyticsStore.setKey("status", "error");
          // Reset counter for future polling
          pollingAttemptsRef.current = 0;
        }
      }
    } catch (error) {
      // Handle fetch error
      analyticsStore.setKey("error", error instanceof Error ? error.message : "Unknown error");
      analyticsStore.setKey("status", "error");

      // Schedule retry after error, respecting the maximum attempts
      if (pollingAttemptsRef.current < MAX_POLLING_ATTEMPTS - 1) {
        const delayMs =
          POLLING_DELAYS[pollingAttemptsRef.current] || POLLING_DELAYS[POLLING_DELAYS.length - 1];
        pollingAttemptsRef.current += 1;
        const newTimer = setTimeout(() => fetchAllAnalytics(), delayMs);
        setPollingTimer(newTimer);
      } else {
        analyticsStore.setKey("status", "error");
        // Reset counter for future polling
        pollingAttemptsRef.current = 0;
      }
    } finally {
      // Always update loading state when done
      analyticsStore.setKey("isLoading", false);
    }
  }, [duration, pollingTimer, $epinetCustomFilters.enabled]);

  // Fetch epinet data based on the current state
  const fetchEpinetData = useCallback(async () => {
    try {
      // Find promoted epinet from content map
      const epinets = ($contentMap || []).filter(
        (item) => (item as any).type === "Epinet" && (item as any).promoted
      );
      const epinetId = epinets.length > 0 ? epinets[0].id : null;
      if (!epinetId) return;

      if ($epinetCustomFilters.enabled) {
        fetchCustomEpinetData(epinetId);
        return;
      }

      let endHour = 0;
      let startHour;

      if (duration === "daily") {
        startHour = 24;
      } else if (duration === "weekly") {
        startHour = 168;
      } else {
        startHour = 672;
      }

      const url = new URL(`/api/turso/getEpinetCustomMetrics`, window.location.origin);
      url.searchParams.append("id", epinetId);
      url.searchParams.append("visitorType", "all");
      url.searchParams.append("startHour", startHour.toString());
      url.searchParams.append("endHour", endHour.toString());

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Epinet metrics request failed with status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Update epinet data with results
        analyticsStore.setKey("epinet", result.data.epinet);

        // Update available visitor IDs in the filter store
        epinetCustomFilters.set({
          ...$epinetCustomFilters,
          availableVisitorIds: result.data.availableVisitorIds || [],
        });
      }
    } catch (error) {
      console.error("Error fetching epinet data:", error);
    }
  }, [duration, $epinetCustomFilters.enabled, $contentMap]);

  const fetchCustomEpinetData = useCallback(
    async (epinetId: string) => {
      // Don't fetch if already fetching
      if (customFetchInProgress) return;

      try {
        setCustomFetchInProgress(true);

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

          // Update available visitor IDs in the filter store
          epinetCustomFilters.set({
            ...$epinetCustomFilters,
            availableVisitorIds: result.data.availableVisitorIds || [],
          });
        }
      } catch (error) {
        console.error("Error fetching custom epinet data:", error);
      } finally {
        setCustomFetchInProgress(false);
      }
    },
    [$epinetCustomFilters, customFetchInProgress]
  );

  // Create debounced version of fetchCustomEpinetData to avoid rapid re-fetching
  const debouncedFetchCustomEpinetData = useCallback(
    debounce(() => {
      // Find promoted epinet from content map
      const epinets = ($contentMap || []).filter(
        (item) => (item as any).type === "Epinet" && (item as any).promoted
      );
      const epinetId = epinets.length > 0 ? epinets[0].id : null;

      if (epinetId) {
        fetchCustomEpinetData(epinetId);
      }
    }, 500),
    [fetchCustomEpinetData, $contentMap]
  );

  return null;
};

export default PullDashboardAnalytics;
