import { useState, useEffect, useMemo } from "react";
import { useStore } from "@nanostores/react";
import CursorArrowRippleIcon from "@heroicons/react/24/outline/CursorArrowRippleIcon";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import { storedDashboardAnalytics, analyticsDuration } from "../../../store/storykeep";
import { classNames } from "../../../utils/common/helpers";
import type { FullContentMap, HotItem } from "../../../types";

const WhatsHot = ({ contentMap }: { contentMap: FullContentMap[] }) => {
  const [isClient, setIsClient] = useState(false);
  const $storedDashboardAnalytics = useStore(storedDashboardAnalytics);
  const $analyticsDuration = useStore(analyticsDuration);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const hotStoryFragments = useMemo(() => {
    if (!$storedDashboardAnalytics || !$storedDashboardAnalytics.hot_story_fragments) return [];

    return $storedDashboardAnalytics.hot_story_fragments
      .map((item: HotItem) => {
        const thisContentMap = contentMap.find((cm) => cm.id === item.id);
        return {
          ...item,
          title: thisContentMap?.title || "Unknown",
          slug: thisContentMap?.slug || "",
        };
      })
      .sort((a, b) => b.total_events - a.total_events);
  }, [$storedDashboardAnalytics, contentMap]);

  const updateDuration = (newValue: "daily" | "weekly" | "monthly") => {
    analyticsDuration.set(newValue);
  };

  if (!isClient) return null;

  if (hotStoryFragments.length === 0) return null;

  return (
    <div>
      <div className="flex justify-between items-center px-3.5 mt-12">
        <h3 className="text-black font-action font-bold my-4">What's Hot</h3>
        <div className="flex flex-wrap gap-x-2 text-md">
          <span className="font-action">Stats for past:</span>
          {["daily", "weekly", "monthly"].map((period) => (
            <button
              key={period}
              onClick={() => updateDuration(period as "daily" | "weekly" | "monthly")}
              className={classNames(
                $analyticsDuration === period ? "font-bold" : "underline",
                "text-mydarkgrey/80 hover:text-myorange"
              )}
            >
              {period === "daily" ? "24 hours" : period === "weekly" ? "7 days" : "4 weeks"}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-mywhite rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-mylightgrey/20">
          <thead className="bg-mylightgrey/20">
            <tr>
              <th
                scope="col"
                className="hidden md:table-cell px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider"
              >
                Title
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider"
              >
                Slug
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider"
              >
                Events
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-mywhite divide-y divide-mylightgrey/10">
            {hotStoryFragments
              .filter((i) => i.slug)
              .map((item) => (
                <tr key={item.id}>
                  <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-myblack truncate max-w-xs">{item.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-mydarkgrey truncate max-w-xs">{item.slug}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-mydarkgrey">{item.total_events}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    <a
                      href={`/${item.slug}`}
                      className="text-myblue hover:text-myorange mr-3 inline-block"
                      title="View"
                    >
                      <CursorArrowRippleIcon className="h-5 w-5" />
                    </a>
                    <a
                      href={`/${item.slug}/edit`}
                      className="text-myblue hover:text-myorange inline-block"
                      title="Edit"
                    >
                      <BeakerIcon className="h-5 w-5" />
                    </a>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WhatsHot;
