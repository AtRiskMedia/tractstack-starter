import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import DashboardActivity from "@/components/storykeep/controls/recharts/DashboardActivity";
import SankeyDiagram from "@/components/storykeep/controls/d3/SankeyDiagram";
import ArrowDownTrayIcon from "@heroicons/react/24/outline/ArrowDownTrayIcon";
import {
  isDemoModeStore,
  analyticsStore,
  analyticsDuration,
  storyfragmentAnalyticsStore,
} from "@/store/storykeep";
import { classNames } from "@/utils/common/helpers";

interface Stat {
  name: string;
  events: number;
  period: string;
}

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

function formatNumber(num: number): string {
  if (num < 10000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + "K";
  return (num / 1000000).toFixed(2) + "M";
}

export default function PageViewStats() {
  const [isClient, setIsClient] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Use the consolidated analytics store
  const analytics = useStore(analyticsStore);
  const $isDemoMode = useStore(isDemoModeStore);
  const $analyticsDuration = useStore(analyticsDuration);
  const $storyfragmentAnalytics = useStore(storyfragmentAnalyticsStore);
  const duration = $analyticsDuration;

  // Extract values from the store
  const { dashboard, leads: leadMetrics, epinet: epinetData, isLoading, status, error } = analytics;

  // Calculate total lifetime visitors from storyfragmentAnalytics
  const totalLifetimeVisitors = Object.values($storyfragmentAnalytics.byId).reduce(
    (sum, fragment) => sum + (fragment.unique_visitors || 0),
    0
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  const updateDuration = (newValue: "daily" | "weekly" | "monthly") => {
    analyticsDuration.set(newValue);
  };

  const downloadLeadsCSV = async () => {
    if (isDownloading) return;

    try {
      setIsDownloading(true);

      const response = await fetch("/api/turso/getLeadsList");

      if (!response.ok) {
        throw new Error("Failed to fetch leads list");
      }

      const result = await response.json();
      const leadsList = result.data;

      if (!leadsList || !leadsList.length) {
        alert("No lead data available to download");
        return;
      }

      const headers = Object.keys(leadsList[0]);
      let csvContent = headers.join(",") + "\n";

      leadsList.forEach((lead: any) => {
        const row = headers.map((header) => {
          const value =
            lead[header] === null || lead[header] === undefined ? "" : String(lead[header]);
          return value.includes(",") ? `"${value}"` : value;
        });
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `leads-data-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading leads:", error);
      alert("Failed to download leads. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const DurationSelector = () => (
    <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-sm mt-6 mb-4">
      <span className="font-action text-gray-800 font-bold">Filter analytics:</span>
      {["daily", "weekly", "monthly"].map((period) => (
        <button
          key={period}
          onClick={() => updateDuration(period as "daily" | "weekly" | "monthly")}
          className={classNames(
            "px-3 py-1 rounded-full transition-all duration-200 ease-in-out",
            duration === period
              ? "bg-cyan-600 text-white font-bold shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-cyan-100 hover:text-cyan-800"
          )}
        >
          {period === "daily" ? "24 hours" : period === "weekly" ? "7 days" : "4 weeks"}
        </button>
      ))}
    </div>
  );

  const LoadingPlaceholder = () => (
    <div className="p-0.5 shadow-md">
      <div className="p-4 bg-white rounded-b-md w-full">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/6 animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="px-4 py-4 bg-white rounded-lg shadow-sm border border-gray-100 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <hr className="my-3 border-gray-100" />
              <div className="flex justify-between">
                <div className="w-1/2">
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-1/2 flex justify-end">
                  <div className="w-3/4">
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 mb-2"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="px-4 py-4 bg-white rounded-lg shadow-sm border border-gray-100 animate-pulse"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                {item === 2 && <div className="h-4 bg-gray-200 rounded w-1/6"></div>}
              </div>
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>

        <div className="p-4">
          <div className="h-64 bg-gray-100 rounded-lg w-full mb-6 animate-pulse"></div>
          <div className="w-full p-4 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4 animate-pulse"></div>
            <div className="h-96 bg-gray-100 rounded w-full animate-pulse"></div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-6 mb-4">
          <div className="h-4 bg-gray-200 rounded w-1/6 animate-pulse"></div>
          {["daily", "weekly", "monthly"].map((period) => (
            <div
              key={period}
              className="px-3 py-1 rounded-full bg-gray-200 h-8 w-20 animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    </div>
  );

  // Skeleton loader for lead metrics panel
  const LeadMetricsSkeleton = () => (
    <div className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors relative">
      <div className="flex justify-between items-start">
        <dt className="text-sm font-bold text-gray-800">Total Leads</dt>
        <div className="text-xs text-gray-500">Loading...</div>
      </div>
      <dd className="mt-2">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="text-sm text-gray-600 mt-1">Registered leads (emails collected)</div>
      </dd>
    </div>
  );

  // Skeleton loader for visitors panel
  const VisitorsSkeleton = () => (
    <div className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors">
      <dt className="text-sm font-bold text-gray-800">Lifetime Unique Visitors</dt>
      <dd className="mt-2">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="text-sm text-gray-600 mt-1">Total unique users all time</div>
      </dd>
    </div>
  );

  // Skeleton loader for stats panel
  const StatsSkeleton = ({ name }: { name: string }) => (
    <div className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors">
      <dt className="text-sm font-bold text-gray-800">{name}</dt>
      <dd className="mt-2">
        <div className="flex justify-between items-end">
          <div className="flex-1">
            <div className="text-sm text-gray-600">Events</div>
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          </div>
        </div>
      </dd>
      <hr className="my-3.5 border-gray-100" />
      <dd>
        <div className="flex justify-between items-end">
          <div className="flex-1">
            <div className="text-sm text-gray-600">Anonymous Visitors</div>
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          </div>
          <div className="flex-1 text-right">
            <div className="text-sm text-gray-600">Known Leads</div>
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 mb-1"></div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>-</span>
          <span>-</span>
        </div>
      </dd>
    </div>
  );

  if (!isClient) return null;

  if (isLoading && (!dashboard || !leadMetrics)) return <LoadingPlaceholder />;

  const stats: Stat[] = [
    {
      name: "Last 24 Hours",
      events: dashboard?.stats?.daily ?? 0,
      period: "24h",
    },
    {
      name: "Past 7 Days",
      events: dashboard?.stats?.weekly ?? 0,
      period: "7d",
    },
    {
      name: "Past 28 Days",
      events: dashboard?.stats?.monthly ?? 0,
      period: "28d",
    },
  ];

  return (
    <div className="p-0.5 shadow-md">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        <h3 className="font-bold font-action text-xl mb-4">
          Analytics Dashboard
          {status === "loading" || status === "refreshing" ? (
            <span className="ml-2 text-sm font-normal text-gray-500">
              (Loading data in background...)
            </span>
          ) : null}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {stats.map((item) => {
            if (status === "loading" && !dashboard) {
              return <StatsSkeleton key={item.period} name={item.name} />;
            }

            const period = item.period;
            const firstTimeValue =
              (leadMetrics?.[`first_time_${period}` as keyof typeof leadMetrics] as number) ?? 0;
            const returningValue =
              (leadMetrics?.[`returning_${period}` as keyof typeof leadMetrics] as number) ?? 0;
            const firstTimePercentage =
              (leadMetrics?.[
                `first_time_${period}_percentage` as keyof typeof leadMetrics
              ] as number) ?? 0;
            const returningPercentage =
              (leadMetrics?.[
                `returning_${period}_percentage` as keyof typeof leadMetrics
              ] as number) ?? 0;

            return (
              <div
                key={item.period}
                className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors"
              >
                <dt className="text-sm font-bold text-gray-800">{item.name}</dt>

                <dd className="mt-2">
                  <div className="flex justify-between items-end">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">Events</div>
                      <div className="text-2xl font-bold tracking-tight text-cyan-700">
                        {item.events === 0 ? "-" : formatNumber(item.events)}
                      </div>
                    </div>
                  </div>
                </dd>

                <hr className="my-3.5 border-gray-100" />

                <dd>
                  <div className="flex justify-between items-end">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600">Anonymous Visitors</div>
                      <div className="text-2xl font-bold tracking-tight text-cyan-700">
                        {firstTimeValue === 0 ? "-" : formatNumber(firstTimeValue)}
                      </div>
                    </div>
                    <div className="flex-1 text-right">
                      <div className="text-sm text-gray-600">Known Leads</div>
                      <div className="text-2xl font-bold tracking-tight text-cyan-700">
                        {returningValue === 0 ? "-" : formatNumber(returningValue)}
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 mb-1 overflow-hidden">
                    <div
                      className="bg-cyan-600 h-2.5 float-left"
                      style={{ width: `${firstTimePercentage}%` }}
                    />
                    <div
                      className="bg-cyan-300 h-2.5 float-left"
                      style={{ width: `${returningPercentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>{firstTimePercentage.toFixed(1)}% Anonymous</span>
                    <span>{returningPercentage.toFixed(1)}% Known</span>
                  </div>
                </dd>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Visitors panel with skeleton loader if loading */}
          {status === "loading" && !leadMetrics ? (
            <VisitorsSkeleton />
          ) : (
            <div className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors">
              <dt className="text-sm font-bold text-gray-800">Lifetime Unique Visitors</dt>
              <dd className="mt-2">
                <div className="text-2xl font-bold tracking-tight text-cyan-700">
                  {totalLifetimeVisitors === 0 ? "-" : formatNumber(totalLifetimeVisitors)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total unique users all time</div>
              </dd>
            </div>
          )}

          {/* Leads panel with skeleton loader if loading */}
          {status === "loading" && !leadMetrics ? (
            <LeadMetricsSkeleton />
          ) : (
            <div className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors relative">
              <div className="flex justify-between items-start">
                <dt className="text-sm font-bold text-gray-800">Total Leads</dt>
                {leadMetrics && leadMetrics.total_leads > 0 && (
                  <button
                    onClick={downloadLeadsCSV}
                    disabled={$isDemoMode || isDownloading}
                    title={$isDemoMode ? `Not so fast!` : `Download leads report`}
                    style={{
                      textDecoration: $isDemoMode ? "line-through" : "none",
                      cursor: $isDemoMode ? "not-allowed" : "pointer",
                    }}
                    className="flex items-center text-xs text-myblue hover:text-myorange transition-colors"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                    {isDownloading ? "Downloading..." : "Download"}
                  </button>
                )}
              </div>
              <dd className="mt-2">
                <div className="text-2xl font-bold tracking-tight text-cyan-700">
                  {leadMetrics?.total_leads === 0
                    ? "-"
                    : formatNumber(leadMetrics?.total_leads || 0)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Registered leads (emails collected)
                </div>
              </dd>
            </div>
          )}
        </div>

        <div className="p-4 motion-safe:animate-fadeInUp">
          <DurationSelector />

          {/* Dashboard Activity Chart */}
          {dashboard && dashboard.line && dashboard.line.length > 0 ? (
            <DashboardActivity />
          ) : (
            <div className="h-64 bg-gray-100 rounded-lg w-full mb-6 flex items-center justify-center">
              <div className="text-center text-gray-500">
                {status === "loading" ? (
                  <div className="flex flex-col items-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-myblue border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                    <p className="mt-4">Loading activity data...</p>
                  </div>
                ) : (
                  "No activity data available yet"
                )}
              </div>
            </div>
          )}

          {/* Epinet Sankey Diagram */}
          {status === "loading" &&
          (!epinetData ||
            !epinetData.nodes ||
            !epinetData.links ||
            epinetData.nodes.length === 0 ||
            epinetData.links.length === 0) ? (
            <div className="w-full p-4 bg-white rounded-lg shadow-sm border border-gray-100 mt-12">
              <div className="h-96 bg-gray-100 rounded w-full flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-myblue border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                  <p className="mt-4 text-sm text-gray-600">Computing user journey data...</p>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="w-full p-4 bg-white rounded-lg shadow-sm border border-red-100 mt-12">
              <div className="p-4 bg-red-50 text-red-800 rounded-lg mt-4">
                There was an error loading the user journey data. Please try refreshing the page.
              </div>
            </div>
          ) : epinetData &&
            epinetData.nodes &&
            epinetData.links &&
            epinetData.nodes.length > 0 &&
            epinetData.links.length > 0 ? (
            <ErrorBoundary
              fallback={
                <div className="p-4 bg-red-50 text-red-800 rounded-lg">
                  Error rendering user flow diagram. Please check the data and try again.
                </div>
              }
            >
              <div className="relative">
                {status === "loading" || status === "refreshing" ? (
                  <div className="absolute top-0 right-0 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm">
                    Updating...
                  </div>
                ) : null}
                <SankeyDiagram data={{ nodes: epinetData.nodes, links: epinetData.links }} />
                <DurationSelector />
              </div>
            </ErrorBoundary>
          ) : (
            <div className="w-full p-4 bg-white rounded-lg shadow-sm border border-gray-100 mt-12">
              <div className="p-4 bg-gray-50 text-gray-800 rounded-lg mt-4">
                No user journey data is available yet. This visualization will appear when users
                start interacting with your content.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
