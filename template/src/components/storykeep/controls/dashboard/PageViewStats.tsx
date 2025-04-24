import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import DashboardActivity from "@/components/storykeep/controls/recharts/DashboardActivity";
import { storedDashboardAnalytics, storyfragmentAnalyticsStore } from "@/store/storykeep";
import ArrowDownTrayIcon from "@heroicons/react/24/outline/ArrowDownTrayIcon";
import { isDemoModeStore } from "@/store/storykeep.ts";
import type { LeadMetrics } from "@/types";

interface Stat {
  name: string;
  events: number;
  period: string;
}

function formatNumber(num: number): string {
  if (num < 10000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + "K";
  return (num / 1000000).toFixed(2) + "M";
}

export default function PageViewStats() {
  const isDemoMode = isDemoModeStore.get();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [leadMetrics, setLeadMetrics] = useState<LeadMetrics | null>(null);
  const $storedDashboardAnalytics = useStore(storedDashboardAnalytics);
  const $storyfragmentAnalytics = useStore(storyfragmentAnalyticsStore);

  const analytics = Object.values($storyfragmentAnalytics.byId);
  const totalLifetimeVisitors = analytics.reduce(
    (sum, fragment) => sum + (fragment?.unique_visitors || 0),
    0
  );

  const stats: Stat[] = [
    {
      name: "Last 24 Hours",
      events: $storedDashboardAnalytics?.stats?.daily ?? 0,
      period: "24h",
    },
    {
      name: "Past 7 Days",
      events: $storedDashboardAnalytics?.stats?.weekly ?? 0,
      period: "7d",
    },
    {
      name: "Past 28 Days",
      events: $storedDashboardAnalytics?.stats?.monthly ?? 0,
      period: "28d",
    },
  ];

  useEffect(() => {
    setIsClient(true);

    const fetchLeadMetrics = async () => {
      try {
        const response = await fetch("/api/turso/getLeadMetrics");
        if (response.ok) {
          const result = await response.json();
          setLeadMetrics(result.data || null);
        }
      } catch (error) {
        console.error("Error fetching lead metrics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeadMetrics();
  }, []);

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

  // Placeholder skeleton loader component
  const LoadingPlaceholder = () => (
    <div className="p-0.5 shadow-md">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        <h3 className="font-bold font-action text-xl mb-4">Analytics Dashboard</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
              <hr className="my-3.5 border-gray-100" />
              <div className="flex justify-between">
                <div className="w-1/2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
                <div className="w-1/2 flex justify-end">
                  <div className="w-3/4">
                    <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
                    <div className="h-6 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 mb-2 animate-pulse"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            </div>
          ))}
        </div>

        <div className="p-4">
          <div className="h-60 bg-gray-200 rounded w-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  if (!isClient) return null;
  if (isLoading) return <LoadingPlaceholder />;
  if (!leadMetrics) return null;

  return (
    <div className="p-0.5 shadow-md">
      <div className="p-1.5 bg-white rounded-b-md w-full">
        <h3 className="font-bold font-action text-xl mb-4">Analytics Dashboard</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {stats.map((item) => {
            const period = item.period;
            const firstTimeValue = leadMetrics[
              `first_time_${period}` as keyof LeadMetrics
            ] as number;
            const returningValue = leadMetrics[
              `returning_${period}` as keyof LeadMetrics
            ] as number;
            const firstTimePercentage = leadMetrics[
              `first_time_${period}_percentage` as keyof LeadMetrics
            ] as number;
            const returningPercentage = leadMetrics[
              `returning_${period}_percentage` as keyof LeadMetrics
            ] as number;

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
          <div className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors">
            <dt className="text-sm font-bold text-gray-800">Lifetime Unique Visitors</dt>
            <dd className="mt-2">
              <div className="text-2xl font-bold tracking-tight text-cyan-700">
                {totalLifetimeVisitors === 0 ? "-" : formatNumber(totalLifetimeVisitors)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total unique users all time</div>
            </dd>
          </div>

          <div className="px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-100 transition-colors relative">
            <div className="flex justify-between items-start">
              <dt className="text-sm font-bold text-gray-800">Total Leads</dt>
              {leadMetrics.total_leads > 0 && (
                <button
                  onClick={downloadLeadsCSV}
                  disabled={isDemoMode || isDownloading}
                  title={isDemoMode ? `Not so fast!` : `Download leads report`}
                  style={{
                    textDecoration: isDemoMode ? "line-through" : "none",
                    cursor: isDemoMode ? "not-allowed" : "pointer",
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
                {leadMetrics.total_leads === 0 ? "-" : formatNumber(leadMetrics.total_leads)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Registered leads (emails collected)</div>
            </dd>
          </div>
        </div>

        <div className="p-4 motion-safe:animate-fadeInUp">
          <DashboardActivity />
        </div>
      </div>
    </div>
  );
}
