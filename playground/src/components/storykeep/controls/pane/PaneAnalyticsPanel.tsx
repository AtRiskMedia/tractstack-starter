import { useStore } from "@nanostores/react";
import { useState, useEffect, type MouseEvent } from "react";
import ArrowUpIcon from "@heroicons/react/24/outline/ArrowUpIcon";
import { storedAnalytics } from "@/store/storykeep";

const PaneAnalyticsPanel = ({ nodeId }: { nodeId: string }) => {
  const $storedAnalytics = useStore(storedAnalytics);
  const [isDataReady, setIsDataReady] = useState(false);

  const data = $storedAnalytics[nodeId] || { pie: [], line: [] };

  useEffect(() => {
    if ($storedAnalytics && nodeId in $storedAnalytics) {
      setIsDataReady(true);
    }
  }, [$storedAnalytics, nodeId]);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  if (!isDataReady) return null;

  return (
    <div className="" onClick={handleClick}>
      <div className="p-0.5 flex gap-1 w-full group">
        <div className="px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded-b-md">
          <ArrowUpIcon className="w-6 h-6 inline-block" /> Recent activity on this Pane
        </div>

        <div className="flex gap-1">
          {data.pie.map((verb) => (
            <span
              key={verb.id}
              className="px-2 py-1 text-cyan-700 text-sm rounded shadow-inner bg-white"
            >
              {verb.id}: {verb.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaneAnalyticsPanel;
