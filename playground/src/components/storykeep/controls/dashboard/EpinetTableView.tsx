import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { epinetCustomFilters } from "@/store/storykeep";
import { contentMap } from "@/store/events";
import { Accordion } from "@ark-ui/react";
import ChevronLeftIcon from "@heroicons/react/24/outline/ChevronLeftIcon";
import ChevronRightIcon from "@heroicons/react/24/outline/ChevronRightIcon";
import ChevronDownIcon from "@heroicons/react/24/outline/ChevronDownIcon";
import NewspaperIcon from "@heroicons/react/24/outline/NewspaperIcon";
import DocumentCheckIcon from "@heroicons/react/24/outline/DocumentCheckIcon";
import DocumentPlusIcon from "@heroicons/react/24/outline/DocumentPlusIcon";
import { classNames } from "@/utils/common/helpers";

interface ContentEvent {
  verb: string;
  count: number;
}

interface ContentItem {
  contentId: string;
  title: string;
  contentType: string;
  events: ContentEvent[];
}

interface ActiveHourData {
  type: "active";
  hourKey: string;
  hourNum: number;
  hourDisplay: string;
  contentItems: ContentItem[];
  hourlyTotal: number;
  relativeToMax: number; // New field: proportion relative to busiest hour
}

interface EmptyHourRange {
  type: "empty";
  startHour: number;
  endHour: number;
  display: string;
  isFuture: boolean;
}

type HourData = ActiveHourData | EmptyHourRange;

interface ContentMapItem {
  id: string;
  title: string;
  type: string;
}

const EpinetTableView = () => {
  const $epinetCustomFilters = useStore(epinetCustomFilters);
  const $contentMap = useStore(contentMap) as ContentMapItem[];
  const [showTable, setShowTable] = useState(false);
  const [currentDay, setCurrentDay] = useState<string | null>(null);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  const getContentInfo = (contentId: string): { title: string; type: string } => {
    const content = $contentMap.find((item) => item.id === contentId);
    if (content) {
      return {
        title: content.title,
        type: content.type,
      };
    }
    return {
      title: contentId.substring(0, 8) + "...",
      type: "Unknown",
    };
  };

  const getLocalDateTime = (hourKey: string): { localDay: string; localHour: number } => {
    try {
      const [year, month, day, hour] = hourKey.split("-").map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day, hour));
      const localDay = `${utcDate.getFullYear()}-${String(utcDate.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(utcDate.getDate()).padStart(2, "0")}`;
      const localHour = utcDate.getHours();
      return { localDay, localHour };
    } catch (e) {
      console.warn(`Failed to parse hourKey: ${hourKey}`, e);
      const [year, month, day] = hourKey.split("-").slice(0, 3).map(Number);
      const localDay = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const localHour = Number(hourKey.split("-")[3]) || 0;
      return { localDay, localHour };
    }
  };

  const formatLocalHourDisplay = (localHour: number): string => {
    return `${localHour.toString().padStart(2, "0")}:00`;
  };

  useEffect(() => {
    const hourlyActivity = $epinetCustomFilters.hourlyNodeActivity || {};
    const hourKeys = Object.keys(hourlyActivity);

    if (hourKeys.length === 0) {
      setAvailableDays([]);
      setCurrentDay(null);
      return;
    }

    const days = Array.from(new Set(hourKeys.map((key) => getLocalDateTime(key).localDay)))
      .sort()
      .reverse();

    setAvailableDays(days);
    setCurrentDay(days[0] || null);
    setCurrentDayIndex(0);
  }, [$epinetCustomFilters.hourlyNodeActivity]);

  const navigateDay = (direction: "prev" | "next") => {
    const newIndex =
      direction === "prev"
        ? Math.min(currentDayIndex + 1, availableDays.length - 1)
        : Math.max(currentDayIndex - 1, 0);

    setCurrentDayIndex(newIndex);
    setCurrentDay(availableDays[newIndex]);
  };

  const getCurrentDayData = (): {
    data: HourData[];
    dailyTotal: number;
    maxHourlyTotal: number;
  } => {
    if (!currentDay) return { data: [], dailyTotal: 0, maxHourlyTotal: 0 };

    const hourlyActivity = $epinetCustomFilters.hourlyNodeActivity || {};
    const result: HourData[] = [];
    let emptyRangeStart: number | null = null;
    let dailyTotal = 0;
    let maxHourlyTotal = 0; // Track the busiest hour's total

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const isToday = currentDay === today;
    const currentLocalHour = now.getHours();

    type ProcessedHourData = {
      hourKey: string;
      data: Record<string, ContentItem>;
      hourlyTotal: number;
    };

    const activityByLocalHour: Record<number, ProcessedHourData> = {};

    // First pass: Process hourly activity and calculate totals
    Object.entries(hourlyActivity).forEach(([hourKey, contentItems]) => {
      const { localDay, localHour } = getLocalDateTime(hourKey);
      if (localDay === currentDay) {
        let hourlyTotal = 0;
        const processedData: Record<string, ContentItem> = {};

        Object.entries(contentItems).forEach(([contentId, data]) => {
          const contentInfo = getContentInfo(contentId);
          const events: ContentEvent[] = [];

          Object.entries(data.events).forEach(([verb, count]) => {
            events.push({ verb, count: count as number });
            hourlyTotal += count as number;
          });

          processedData[contentId] = {
            contentId,
            title: contentInfo.title,
            contentType: contentInfo.type,
            events,
          };
        });

        dailyTotal += hourlyTotal;
        maxHourlyTotal = Math.max(maxHourlyTotal, hourlyTotal); // Update max

        activityByLocalHour[localHour] = {
          hourKey,
          data: processedData,
          hourlyTotal,
        };
      }
    });

    // Second pass: Generate hour data with differential contribution
    for (let localHour = 0; localHour < 24; localHour++) {
      const activity = activityByLocalHour[localHour];
      const hasActivity = activity && Object.keys(activity.data).length > 0;

      if (hasActivity) {
        if (emptyRangeStart !== null) {
          const localEmptyEnd = localHour - 1;
          const isFuture = isToday && emptyRangeStart > currentLocalHour;
          result.push({
            type: "empty",
            startHour: emptyRangeStart,
            endHour: localEmptyEnd,
            display:
              emptyRangeStart === localEmptyEnd
                ? formatLocalHourDisplay(emptyRangeStart)
                : `${formatLocalHourDisplay(emptyRangeStart)} - ${formatLocalHourDisplay(
                    localEmptyEnd
                  )}:59`,
            isFuture,
          });
          emptyRangeStart = null;
        }

        const contentItems = Object.values(activity.data).sort((a, b) =>
          a.title.localeCompare(b.title)
        );

        // Calculate differential contribution relative to busiest hour
        const relativeToMax = maxHourlyTotal > 0 ? activity.hourlyTotal / maxHourlyTotal : 0;

        result.push({
          type: "active",
          hourKey: activity.hourKey,
          hourNum: localHour,
          hourDisplay: formatLocalHourDisplay(localHour),
          contentItems,
          hourlyTotal: activity.hourlyTotal,
          relativeToMax, // New field for differential contribution
        });
      } else {
        if (emptyRangeStart === null) {
          emptyRangeStart = localHour;
        }
      }
    }

    if (emptyRangeStart !== null) {
      const localEmptyEnd = 23;
      const isFuture = isToday && emptyRangeStart > currentLocalHour;
      result.push({
        type: "empty",
        startHour: emptyRangeStart,
        endHour: localEmptyEnd,
        display:
          emptyRangeStart === localEmptyEnd
            ? formatLocalHourDisplay(emptyRangeStart)
            : `${formatLocalHourDisplay(emptyRangeStart)} - ${formatLocalHourDisplay(
                localEmptyEnd
              )}:59`,
        isFuture,
      });
    }

    return {
      data: result.sort((a, b) => {
        if (a.type === "active" && b.type === "active") {
          return a.hourNum - b.hourNum;
        } else if (a.type === "active" && b.type === "empty") {
          return a.hourNum - b.startHour;
        } else if (a.type === "empty" && b.type === "active") {
          return a.startHour - b.hourNum;
        } else if (a.type === "empty" && b.type === "empty") {
          return a.startHour - b.startHour;
        }
        return 0;
      }),
      dailyTotal,
      maxHourlyTotal,
    };
  };

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case "StoryFragment":
        return <NewspaperIcon className="h-4 w-4 mr-1" />;
      case "Pane":
        return <DocumentCheckIcon className="h-4 w-4 mr-1" />;
      default:
        return <DocumentPlusIcon className="h-4 w-4 mr-1" />;
    }
  };

  const { data: dayData, dailyTotal } = getCurrentDayData();
  const hasData = availableDays.length > 0;

  const formatDate = (dateStr: string): string => {
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getTimezoneName = (): string => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      return "Local Time";
    }
  };

  if (!hasData) return null;

  if (!showTable) {
    return (
      <div className="mt-4">
        <button
          onClick={() => setShowTable(true)}
          className="px-3 py-1 text-sm bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors duration-200 shadow-sm"
        >
          Show Analytics in Table View
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="border border-gray-200 rounded-lg shadow-sm bg-white">
        <div className="flex justify-between items-center p-3 border-b border-gray-200">
          <h3 className="text-sm font-bold text-gray-800">
            Hourly Activity ({getTimezoneName()}) - {dailyTotal} Total Events
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTable(false)}
              className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200"
            >
              Hide Table View
            </button>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => navigateDay("prev")}
                disabled={currentDayIndex >= availableDays.length - 1}
                className={classNames(
                  "p-1 rounded-full",
                  currentDayIndex >= availableDays.length - 1
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                title="Previous day (older)"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-600">
                {currentDay ? formatDate(currentDay) : ""}
              </span>
              <button
                onClick={() => navigateDay("next")}
                disabled={currentDayIndex === 0}
                className={classNames(
                  "p-1 rounded-full",
                  currentDayIndex === 0
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                title="Next day (newer)"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <Accordion.Root multiple className="divide-y divide-gray-100">
          {dayData.map((item) => (
            <Accordion.Item
              key={
                item.type === "active"
                  ? `active-${item.hourKey}`
                  : `empty-${item.startHour}-${item.endHour}`
              }
              value={
                item.type === "active"
                  ? `active-${item.hourKey}`
                  : `empty-${item.startHour}-${item.endHour}`
              }
              className="p-3"
            >
              <Accordion.ItemTrigger className="flex items-center w-full text-left focus:outline-none hover:bg-gray-50 transition-colors duration-200">
                {item.type === "active" ? (
                  <div className="flex items-center flex-grow space-x-4">
                    <span className="text-sm font-bold text-gray-700 min-w-[60px]">
                      {item.hourDisplay}
                    </span>
                    <span className="text-xs font-medium text-cyan-600 min-w-[80px]">
                      {item.hourlyTotal} {item.hourlyTotal === 1 ? "event" : "events"}
                    </span>
                    <div className="relative h-2 max-w-48 w-full bg-gray-200 rounded">
                      <div
                        className="absolute top-0 left-0 h-2 bg-cyan-600 rounded"
                        style={{ width: `${Math.max(item.relativeToMax * 100, 5)}%` }}
                        title={`${item.hourlyTotal} events (${(item.relativeToMax * 100).toFixed(1)}% of busiest hour)`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center flex-grow">
                    <span className="text-sm font-bold text-gray-700">{item.display}</span>
                    <span className="ml-2 text-xs text-gray-500 italic">
                      {item.isFuture ? "The future awaits!" : "No activity"}
                    </span>
                  </div>
                )}
                <Accordion.ItemIndicator>
                  <ChevronDownIcon
                    className={classNames(
                      "h-5 w-5 text-gray-500 transition-transform duration-200",
                      "data-[state=open]:rotate-180"
                    )}
                  />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>

              <Accordion.ItemContent className="pt-2">
                {item.type === "active" && (
                  <div className="space-y-4">
                    {item.contentItems.map((content) => (
                      <div key={`${item.hourKey}-${content.contentId}`} className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                          {getContentIcon(content.contentType)}
                          {content.title}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {content.events.map((event, eventIdx) => (
                            <div
                              key={`${item.hourKey}-${content.contentId}-${event.verb}-${eventIdx}`}
                              className="py-0.5 px-2 text-xs font-bold rounded-full bg-cyan-100 text-cyan-800"
                            >
                              {event.verb} [{event.count}]
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Accordion.ItemContent>
            </Accordion.Item>
          ))}

          {dayData.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-500">
              No activity data available for this day
            </div>
          )}
        </Accordion.Root>
      </div>
    </div>
  );
};

export default EpinetTableView;
