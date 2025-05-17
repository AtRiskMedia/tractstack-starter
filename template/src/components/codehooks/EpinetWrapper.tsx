import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { analyticsStore, epinetCustomFilters } from "@/store/storykeep";
import SankeyDiagram from "@/components/storykeep/controls/d3/SankeyDiagram";
import EpinetDurationSelector from "@/components/storykeep/controls/dashboard/EpinetDurationSelector";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

const ErrorBoundary = ({ children, fallback }: ErrorBoundaryProps) => {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  if (hasError) return <>{fallback}</>;

  return <div onError={handleError}>{children}</div>;
};

const EpinetWrapper = () => {
  const analytics = useStore(analyticsStore);
  const $epinetCustomFilters = useStore(epinetCustomFilters);
  const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null);
  const [pollingAttempts, setPollingAttempts] = useState(0);

  const MAX_POLLING_ATTEMPTS = 3;
  const POLLING_DELAYS = [2000, 5000, 10000]; // 2s, 5s, 10s

  // Clear polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollingTimer) {
        clearTimeout(pollingTimer);
      }
    };
  }, [pollingTimer]);

  // Initialize epinet custom filters with default values on mount
  useEffect(() => {
    const startHour = 168; // Default to one week
    const endHour = 0; // Current hour

    epinetCustomFilters.set({
      enabled: true,
      visitorType: "all",
      selectedUserId: null,
      startHour,
      endHour,
      userCounts: $epinetCustomFilters.userCounts || [],
      hourlyNodeActivity: $epinetCustomFilters.hourlyNodeActivity || {},
    });
  }, []);

  // Fetch data on initial mount
  useEffect(() => {
    fetchEpinetData();
  }, []);

  useEffect(() => {
    if (
      $epinetCustomFilters.enabled &&
      $epinetCustomFilters.visitorType !== null &&
      $epinetCustomFilters.startHour !== null &&
      $epinetCustomFilters.endHour !== null
    ) {
      setPollingAttempts(0);
      fetchEpinetData();
    }
  }, [
    $epinetCustomFilters.enabled,
    $epinetCustomFilters.visitorType,
    $epinetCustomFilters.selectedUserId,
    $epinetCustomFilters.startHour,
    $epinetCustomFilters.endHour,
  ]);

  const fetchEpinetData = useCallback(async () => {
    try {
      analyticsStore.setKey("isLoading", true);

      if (pollingTimer) {
        clearTimeout(pollingTimer);
        setPollingTimer(null);
      }

      const url = new URL("/api/turso/getEpinetCustomMetrics", window.location.origin);
      url.searchParams.append("visitorType", $epinetCustomFilters.visitorType || "all");
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
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Check if data is still loading
        const epinetData = result.data.epinet;

        if (epinetData && (epinetData.status === "loading" || epinetData.status === "refreshing")) {
          // If data is still loading, poll again after delay
          if (pollingAttempts < MAX_POLLING_ATTEMPTS) {
            const delayMs =
              POLLING_DELAYS[pollingAttempts] || POLLING_DELAYS[POLLING_DELAYS.length - 1];

            const newTimer = setTimeout(() => {
              setPollingAttempts(pollingAttempts + 1);
              fetchEpinetData();
            }, delayMs);

            setPollingTimer(newTimer);
            return;
          }
        }

        analyticsStore.setKey("epinet", result.data.epinet);
        analyticsStore.setKey("status", "complete");

        const currentFilterState = epinetCustomFilters.get();
        epinetCustomFilters.set({
          ...currentFilterState,
          userCounts: result.data.userCounts || [],
          hourlyNodeActivity: result.data.hourlyNodeActivity || {},
        });

        setPollingAttempts(0);
      } else {
        throw new Error(result.error || "Unknown API error");
      }
    } catch (error) {
      analyticsStore.setKey("error", error instanceof Error ? error.message : "Unknown error");
      analyticsStore.setKey("status", "error");

      // Schedule a retry if we haven't reached max attempts
      if (pollingAttempts < MAX_POLLING_ATTEMPTS) {
        const delayMs =
          POLLING_DELAYS[pollingAttempts] || POLLING_DELAYS[POLLING_DELAYS.length - 1];

        const newTimer = setTimeout(() => {
          setPollingAttempts(pollingAttempts + 1);
          fetchEpinetData();
        }, delayMs);

        setPollingTimer(newTimer);
      }
    } finally {
      analyticsStore.setKey("isLoading", false);
    }
  }, [$epinetCustomFilters, pollingAttempts]);

  const { epinet, isLoading, status, error } = analytics;

  if ((isLoading || status === "loading") && !epinet) {
    return (
      <div className="h-96 bg-gray-100 rounded w-full flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-myblue border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-sm text-gray-600">Computing user journey data...</p>
        </div>
      </div>
    );
  }

  if (error && !epinet) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg">
        <p className="font-bold">Error loading user journey visualization</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => {
            setPollingAttempts(0);
            fetchEpinetData();
          }}
          className="mt-3 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (
    !epinet ||
    !epinet.nodes ||
    !epinet.links ||
    epinet.nodes.length === 0 ||
    epinet.links.length === 0
  ) {
    return (
      <div className="p-8 bg-gray-50 text-gray-800 rounded-lg text-center">
        <p>
          No user journey data is available yet. This visualization will appear when users start
          interacting with your content.
        </p>
      </div>
    );
  }

  return (
    <div className="epinet-wrapper p-4 bg-white rounded-lg shadow">
      <ErrorBoundary
        fallback={
          <div className="p-4 bg-red-50 text-red-800 rounded-lg">
            Error rendering user flow diagram. Please check the data and try again.
          </div>
        }
      >
        <div className="relative">
          {(isLoading || status === "loading" || status === "refreshing") && (
            <div className="absolute top-0 right-0 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
              Updating...
            </div>
          )}
          <SankeyDiagram data={{ nodes: epinet.nodes, links: epinet.links }} />
          <EpinetDurationSelector />
        </div>
      </ErrorBoundary>
    </div>
  );
};

export default EpinetWrapper;
