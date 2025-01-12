import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { storedDashboardAnalytics } from "../../../store/storykeep";

interface Stat {
  name: string;
  value: number;
}

function formatNumber(num: number): string {
  if (num < 10000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + "K";
  return (num / 1000000).toFixed(2) + "M";
}

export default function PageViewStats() {
  const [isClient, setIsClient] = useState(false);
  const $storedDashboardAnalytics = useStore(storedDashboardAnalytics);
  const stats: Stat[] = [
    {
      name: "Last 24 hours",
      value: $storedDashboardAnalytics?.stats?.daily ?? 0,
    },
    {
      name: "Past 7 days",
      value: $storedDashboardAnalytics?.stats?.weekly ?? 0,
    },
    {
      name: "Last 28 days",
      value: $storedDashboardAnalytics?.stats?.monthly ?? 0,
    },
  ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <div className="w-full">
      <dl className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        {stats.map((item) => (
          <div key={item.name} className="overflow-hidden rounded-lg bg-mywhite px-4 py-5 shadow">
            <dt className="truncate text-md font-bold text-mydarkgrey">{item.name}</dt>
            <dd className="mt-1 text-3xl font-bold tracking-tight text-myblack">
              {item.value === 0 ? `-` : formatNumber(item.value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
