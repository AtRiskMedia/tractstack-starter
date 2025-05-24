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
  const [epinetPollingTimer, setEpinetPollingTimer] = useState<NodeJS.Timeout | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [customFetchInProgress, setCustomFetchInProgress] = useState(false);
  const previousEnabledRef = useRef<boolean>($epinetCustomFilters.enabled);

  const pollingAttemptsRef = useRef<number>(0);
  const epinetPollingAttemptsRef = useRef<number>(0);
  const MAX_POLLING_ATTEMPTS = 3;
  const POLLING_DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s

  // Clear any existing polling timer when component unmounts
  useEffect(() => {
    return () => {
      if (pollingTimer) {
        clearTimeout(pollingTimer);
      }
      if (epinetPollingTimer) {
        clearTimeout(epinetPollingTimer);
      }
    };
  }, [pollingTimer, epinetPollingTimer]);

  // Initialize epinet custom filters based on duration (on mount and when duration changes)
  useEffect(() => {
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
      userCounts: $epinetCustomFilters.userCounts || [],
      hourlyNodeActivity: $epinetCustomFilters.hourlyNodeActivity || {},
    });
  }, [duration]);

  // Fetch all analytics data when duration changes or on initial mount
  useEffect(() => {
    pollingAttemptsRef.current = 0;
    fetchAllAnalytics();
  }, [duration]);

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

    // Skip if contentMap isn't loaded yet
    if (!$contentMap || $contentMap.length === 0) return;

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
    $contentMap,
  ]);

  const fetchAllAnalytics = useCallback(async () => {
    try {
      analyticsStore.setKey("isLoading", true);

      if (pollingTimer) {
        clearTimeout(pollingTimer);
        setPollingTimer(null);
      }

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
        analyticsStore.setKey("dashboard", result.data.dashboard);
        analyticsStore.setKey("leads", result.data.leads);
        analyticsStore.setKey("status", result.status);
        analyticsStore.setKey("lastUpdated", Date.now());
        analyticsStore.setKey("error", null);

        if (result.status === "loading" || result.status === "refreshing") {
          if (pollingAttemptsRef.current < MAX_POLLING_ATTEMPTS - 1) {
            const delayMs =
              POLLING_DELAYS[pollingAttemptsRef.current] ||
              POLLING_DELAYS[POLLING_DELAYS.length - 1];

            pollingAttemptsRef.current += 1;

            const newTimer = setTimeout(() => {
              fetchAllAnalytics();
            }, delayMs);

            setPollingTimer(newTimer);
          } else {
            analyticsStore.setKey("status", "complete");
            pollingAttemptsRef.current = 0;
          }
        } else {
          pollingAttemptsRef.current = 0;
        }
      } else {
        analyticsStore.setKey("error", result.error || "Unknown API error");
        analyticsStore.setKey("status", "error");

        if (pollingAttemptsRef.current < MAX_POLLING_ATTEMPTS - 1) {
          const delayMs =
            POLLING_DELAYS[pollingAttemptsRef.current] || POLLING_DELAYS[POLLING_DELAYS.length - 1];
          pollingAttemptsRef.current += 1;
          const newTimer = setTimeout(() => fetchAllAnalytics(), delayMs);
          setPollingTimer(newTimer);
        } else {
          analyticsStore.setKey("status", "error");
          pollingAttemptsRef.current = 0;
        }
      }
    } catch (error) {
      analyticsStore.setKey("error", error instanceof Error ? error.message : "Unknown error");
      analyticsStore.setKey("status", "error");

      if (pollingAttemptsRef.current < MAX_POLLING_ATTEMPTS - 1) {
        const delayMs =
          POLLING_DELAYS[pollingAttemptsRef.current] || POLLING_DELAYS[POLLING_DELAYS.length - 1];
        pollingAttemptsRef.current += 1;
        const newTimer = setTimeout(() => fetchAllAnalytics(), delayMs);
        setPollingTimer(newTimer);
      } else {
        analyticsStore.setKey("status", "error");
        pollingAttemptsRef.current = 0;
      }
    } finally {
      analyticsStore.setKey("isLoading", false);
    }
  }, [duration, pollingTimer, $epinetCustomFilters.enabled]);

  const fetchCustomEpinetData = useCallback(
    async (epinetId: string) => {
      if (customFetchInProgress) return;

      try {
        setCustomFetchInProgress(true);

        if (epinetPollingTimer) {
          clearTimeout(epinetPollingTimer);
          setEpinetPollingTimer(null);
        }

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
          analyticsStore.setKey("epinet", result.data.epinet);

          const currentFilterState = epinetCustomFilters.get();
          epinetCustomFilters.set({
            ...currentFilterState,
            userCounts: result.data.userCounts || [],
            hourlyNodeActivity: result.data.hourlyNodeActivity || {},
          });

          if (result.status === "loading" || result.status === "refreshing") {
            if (epinetPollingAttemptsRef.current < MAX_POLLING_ATTEMPTS - 1) {
              const delayMs =
                POLLING_DELAYS[epinetPollingAttemptsRef.current] ||
                POLLING_DELAYS[POLLING_DELAYS.length - 1];

              epinetPollingAttemptsRef.current += 1;

              const newTimer = setTimeout(() => {
                fetchCustomEpinetData(epinetId);
              }, delayMs);

              setEpinetPollingTimer(newTimer);
            } else {
              epinetPollingAttemptsRef.current = 0;
            }
          } else {
            epinetPollingAttemptsRef.current = 0;
          }
        }
      } catch (error) {
        console.error("Error fetching custom epinet data:", error);
      } finally {
        setCustomFetchInProgress(false);
      }
    },
    [$epinetCustomFilters, customFetchInProgress, epinetPollingTimer]
  );

  const debouncedFetchCustomEpinetData = useCallback(
    debounce(() => {
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
