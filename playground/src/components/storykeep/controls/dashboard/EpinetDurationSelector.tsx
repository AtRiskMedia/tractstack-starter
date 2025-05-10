import { useState, useEffect, useCallback } from "react";
import { useStore } from "@nanostores/react";
import { analyticsDuration, epinetCustomFilters } from "@/store/storykeep";
import { MAX_ANALYTICS_HOURS } from "@/constants";
import { Select, createListCollection } from "@ark-ui/react";
import { RadioGroup } from "@ark-ui/react/radio-group";
import { Portal } from "@ark-ui/react/portal";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import ChevronLeftIcon from "@heroicons/react/24/outline/ChevronLeftIcon";
import ChevronRightIcon from "@heroicons/react/24/outline/ChevronRightIcon";

const hourOptions = [
  ...Array.from({ length: 24 }, (_, i) => ({
    value: i.toString().padStart(2, "0"),
    label: `${i.toString().padStart(2, "0")}:00`,
  })),
  { value: "23:59", label: "23:59" },
];
const hourCollection = createListCollection({
  items: hourOptions,
});

const EpinetDurationSelector = () => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [currentUserPage, setCurrentUserPage] = useState(0);
  const usersPerPage = 50;

  const $analyticsDuration = useStore(analyticsDuration);
  const $epinetCustomFilters = useStore(epinetCustomFilters);

  const [localFilters, setLocalFilters] = useState({
    visitorType: $epinetCustomFilters.visitorType || "all",
    selectedUserId: $epinetCustomFilters.selectedUserId || null,
    startHour: "00",
    endHour: "23:59",
  });

  useEffect(() => {
    setLocalFilters((prev) => ({
      ...prev,
      visitorType: $epinetCustomFilters.visitorType || "all",
      selectedUserId: $epinetCustomFilters.selectedUserId,
    }));
  }, [$epinetCustomFilters]);

  useEffect(() => {
    const now = new Date();
    const endDate = new Date();
    let startDate = new Date();

    if ($analyticsDuration === "daily") {
      startDate.setHours(now.getHours() - 24);
    } else if ($analyticsDuration === "weekly") {
      startDate.setDate(now.getDate() - 7);
    } else if ($analyticsDuration === "monthly") {
      startDate.setDate(now.getDate() - 28);
    }

    setStartDate(startDate);
    setEndDate(endDate);

    const startHour = startDate.getHours().toString().padStart(2, "0");
    const endHour =
      endDate.getHours() === 23 ? "23:59" : endDate.getHours().toString().padStart(2, "0");

    setLocalFilters((prev) => ({
      ...prev,
      startHour,
      endHour,
    }));
  }, [$analyticsDuration]);

  useEffect(() => {
    setCurrentUserPage(0);
  }, [localFilters.visitorType]);

  const getHoursFromDuration = useCallback((): [number, number] => {
    switch ($analyticsDuration) {
      case "daily":
        return [0, 24];
      case "weekly":
        return [0, 168];
      case "monthly":
        return [0, 672];
      default:
        return [0, 168];
    }
  }, [$analyticsDuration]);

  const visitorTypes = [
    { id: "all", title: "All Traffic", description: "All visitors" },
    { id: "anonymous", title: "Anonymous", description: "Anonymous visitors" },
    { id: "known", title: "Known Leads", description: "Known visitors" },
  ] as const;

  const updateDuration = (newValue: "daily" | "weekly" | "monthly") => {
    toggleCustomFilters(false);
    analyticsDuration.set(newValue);
  };

  const toggleCustomFilters = (enabled: boolean) => {
    if (enabled) {
      const [endHour, startHour] = getHoursFromDuration();
      epinetCustomFilters.set({
        enabled,
        visitorType: localFilters.visitorType,
        startHour,
        endHour,
        selectedUserId: $epinetCustomFilters.selectedUserId,
        availableVisitorIds: $epinetCustomFilters.availableVisitorIds || [],
      });
    } else {
      epinetCustomFilters.set({
        enabled,
        visitorType: "all",
        startHour: null,
        endHour: null,
        selectedUserId: null,
        availableVisitorIds: $epinetCustomFilters.availableVisitorIds || [],
      });
    }
  };

  const updateVisitorType = (type: "all" | "anonymous" | "known") => {
    setLocalFilters((prev) => ({
      ...prev,
      visitorType: type,
      selectedUserId: null,
    }));
  };

  const updateSelectedUser = (userId: string | null) => {
    setLocalFilters((prev) => ({
      ...prev,
      selectedUserId: userId,
    }));
  };

  const updateHour = (type: "startHour" | "endHour", hour: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [type]: hour,
    }));
  };

  const updateDateRange = () => {
    if (!startDate || !endDate) return;

    const startDateTime = new Date(startDate);
    const [startHour, startMinute] = localFilters.startHour.split(":").map(Number);
    startDateTime.setHours(startHour, startMinute || 0, 0, 0);

    const endDateTime = new Date(endDate);
    const [endHour, endMinute] = localFilters.endHour.split(":").map(Number);
    endDateTime.setHours(
      endHour,
      endMinute || 59,
      endMinute === 59 ? 59 : 0,
      endMinute === 59 ? 999 : 0
    );

    const nowUtc = new Date();
    const startUtc = new Date(
      Date.UTC(
        startDateTime.getFullYear(),
        startDateTime.getMonth(),
        startDateTime.getDate(),
        startDateTime.getHours(),
        startDateTime.getMinutes(),
        startDateTime.getSeconds()
      )
    );
    const endUtc = new Date(
      Date.UTC(
        endDateTime.getFullYear(),
        endDateTime.getMonth(),
        endDateTime.getDate(),
        endDateTime.getHours(),
        endDateTime.getMinutes(),
        endDateTime.getSeconds()
      )
    );

    const startHoursHence = Math.round((nowUtc.getTime() - startUtc.getTime()) / (1000 * 60 * 60));
    const endHoursHence = Math.round((nowUtc.getTime() - endUtc.getTime()) / (1000 * 60 * 60));

    epinetCustomFilters.set({
      ...$epinetCustomFilters,
      visitorType: localFilters.visitorType,
      selectedUserId: localFilters.selectedUserId,
      startHour: Math.max(0, Math.min(startHoursHence, MAX_ANALYTICS_HOURS)),
      endHour: Math.max(0, Math.min(endHoursHence, MAX_ANALYTICS_HOURS)),
    });
  };

  const paginatedVisitorIds = ($epinetCustomFilters.availableVisitorIds || [])
    .filter((id): id is string => typeof id === "string")
    .slice(currentUserPage * usersPerPage, (currentUserPage + 1) * usersPerPage);

  const totalUserPages = Math.ceil(
    (($epinetCustomFilters.availableVisitorIds || []).filter((id) => typeof id === "string")
      .length || 0) / usersPerPage
  );

  const nextUserPage = () => {
    if (currentUserPage < totalUserPages - 1) {
      setCurrentUserPage(currentUserPage + 1);
    }
  };

  const prevUserPage = () => {
    if (currentUserPage > 0) {
      setCurrentUserPage(currentUserPage - 1);
    }
  };

  const maxDate = new Date();
  const minDate = new Date();
  minDate.setHours(minDate.getHours() - MAX_ANALYTICS_HOURS);

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return "Select date";
    return date.toLocaleDateString();
  };

  const formatDateHourDisplay = (date: Date, hour: string) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const time = hour === "23:59" ? "23:59" : `${hour}:00`;
    return `${month}/${day}/${year} ${time} (Local Time)`;
  };

  const setPresetDateRange = (period: string) => {
    const newEndDate = new Date();
    const newStartDate = new Date();

    if (period === "24h") {
      newStartDate.setHours(newEndDate.getHours() - 24);
      setLocalFilters((prev) => ({ ...prev, startHour: "00", endHour: "23:59" }));
    } else if (period === "7d") {
      newStartDate.setDate(newStartDate.getDate() - 7);
      setLocalFilters((prev) => ({ ...prev, startHour: "00", endHour: "23:59" }));
    } else if (period === "30d") {
      newStartDate.setDate(newStartDate.getDate() - 30);
      setLocalFilters((prev) => ({ ...prev, startHour: "00", endHour: "23:59" }));
    }

    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setIsDatePickerOpen(false);
  };

  const radioGroupStyles = `
    .radio-control[data-state="unchecked"] .radio-dot {
      background-color: #d1d5db;
    }
    .radio-control[data-state="checked"] .radio-dot {
      background-color: #0891b2;
    }
    .radio-control[data-state="checked"] {
      border-color: #0891b2;
    }
    .radio-item {
      border: 1px solid #d1d5db;
    }
    .radio-item[data-state="checked"] {
      border-color: #0891b2;
    }
    .radio-item:hover {
      background-color: #f3f4f6;
    }
    @media (max-width: 640px) {
      .radio-item {
        flex: 1 1 100%;
      }
    }
    @media (min-width: 641px) {
      .radio-item {
        flex: 1 1 calc(33.333% - 0.5rem);
      }
    }
  `;

  const getActiveFilterDescription = () => {
    const duration = $analyticsDuration;
    return duration === "daily" ? "24 hours" : duration === "weekly" ? "7 days" : "4 weeks";
  };

  const formatVisitorId = (visitorId: unknown): string => {
    if (typeof visitorId !== "string") {
      console.warn("Invalid visitorId:", visitorId);
      return "Unknown ID";
    }
    return `${visitorId.substring(0, 8)}...`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-sm mt-6">
        {["daily", "weekly", "monthly"].map((period) => (
          <button
            key={period}
            onClick={() => updateDuration(period as "daily" | "weekly" | "monthly")}
            className={
              $analyticsDuration === period && !$epinetCustomFilters.enabled
                ? "px-3 py-1 rounded-full bg-cyan-600 text-white font-bold shadow-sm"
                : "px-3 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-cyan-100 hover:text-cyan-800"
            }
          >
            {period === "daily" ? "24 hours" : period === "weekly" ? "7 days" : "4 weeks"}
          </button>
        ))}
        <button
          onClick={() => toggleCustomFilters(!$epinetCustomFilters.enabled)}
          className={
            $epinetCustomFilters.enabled
              ? "px-3 py-1 rounded-full bg-cyan-600 text-white font-bold shadow-sm"
              : "px-3 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-cyan-100 hover:text-cyan-800"
          }
        >
          Custom View
        </button>
      </div>

      {$epinetCustomFilters.enabled && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="flex flex-col space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
            <div className="space-y-2">
              <style>{radioGroupStyles}</style>
              <RadioGroup.Root
                value={localFilters.visitorType}
                onValueChange={({ value }) => {
                  updateVisitorType(value as "all" | "anonymous" | "known");
                }}
              >
                <RadioGroup.Label className="sr-only">Visitor Type</RadioGroup.Label>
                <div className="flex flex-wrap gap-2">
                  {visitorTypes.map((type) => (
                    <RadioGroup.Item
                      key={type.id}
                      value={type.id}
                      className="radio-item relative flex cursor-pointer rounded-lg px-4 py-2 focus:outline-none"
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center">
                          <RadioGroup.ItemControl className="radio-control h-4 w-4 rounded-full border border-gray-300 mr-2 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full radio-dot" />
                          </RadioGroup.ItemControl>
                          <RadioGroup.ItemText>
                            <div className="text-sm">
                              <p className="font-bold text-gray-800">{type.title}</p>
                              <span className="inline text-gray-600">{type.description}</span>
                            </div>
                          </RadioGroup.ItemText>
                        </div>
                        <div className="shrink-0 text-cyan-600 hidden data-[state=checked]:block">
                          <CheckCircleIcon className="h-5 w-5" />
                        </div>
                      </div>
                      <RadioGroup.ItemHiddenInput />
                    </RadioGroup.Item>
                  ))}
                </div>
              </RadioGroup.Root>
            </div>

            <div className="space-y-1">
              <div className="block text-sm font-medium text-gray-700">Date Range</div>
              <div className="relative">
                <button
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm text-left"
                >
                  {startDate && endDate
                    ? `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
                    : "Select date range"}
                </button>

                {isDatePickerOpen && (
                  <div className="absolute z-10 mt-1 bg-white rounded-md shadow-lg p-2 w-full sm:w-auto">
                    <div className="flex flex-wrap gap-2 justify-between mb-2">
                      <button
                        className={`p-1 rounded-md hover:bg-gray-100 text-sm ${$analyticsDuration === "daily" ? "font-bold bg-cyan-50" : ""}`}
                        onClick={() => setPresetDateRange("24h")}
                      >
                        Last 24 hours
                      </button>
                      <button
                        className={`p-1 rounded-md hover:bg-gray-100 text-sm ${$analyticsDuration === "weekly" ? "font-bold bg-cyan-50" : ""}`}
                        onClick={() => setPresetDateRange("7d")}
                      >
                        Last 7 days
                      </button>
                      <button
                        className={`p-1 rounded-md hover:bg-gray-100 text-sm ${$analyticsDuration === "monthly" ? "font-bold bg-cyan-50" : ""}`}
                        onClick={() => setPresetDateRange("30d")}
                      >
                        Last 30 days
                      </button>
                      <button
                        className="p-1 rounded-md hover:bg-gray-100 text-sm"
                        onClick={() => setIsDatePickerOpen(false)}
                      >
                        Close
                      </button>
                    </div>

                    <div className="mb-2">
                      <p className="text-sm font-medium">
                        Start date: {formatDateDisplay(startDate)}
                      </p>
                      <p className="text-sm font-medium">End date: {formatDateDisplay(endDate)}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <div className="block text-sm font-medium">Start</div>
                        <input
                          type="date"
                          className="w-full px-2 py-1 border rounded"
                          onChange={(e) =>
                            setStartDate(e.target.value ? new Date(e.target.value) : null)
                          }
                          value={startDate ? startDate.toISOString().split("T")[0] : ""}
                          min={minDate.toISOString().split("T")[0]}
                          max={maxDate.toISOString().split("T")[0]}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="block text-sm font-medium">End</div>
                        <input
                          type="date"
                          className="w-full px-2 py-1 border rounded"
                          onChange={(e) =>
                            setEndDate(e.target.value ? new Date(e.target.value) : null)
                          }
                          value={endDate ? endDate.toISOString().split("T")[0] : ""}
                          min={
                            startDate
                              ? startDate.toISOString().split("T")[0]
                              : minDate.toISOString().split("T")[0]
                          }
                          max={maxDate.toISOString().split("T")[0]}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="block text-sm font-medium text-gray-700">Hour Range</div>
              <div className="flex flex-row gap-4">
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="block text-sm font-medium text-gray-700">Start Hour</div>
                  <Select.Root
                    collection={hourCollection}
                    value={[localFilters.startHour]}
                    onValueChange={({ value }) => updateHour("startHour", value[0])}
                  >
                    <Select.Control>
                      <Select.Trigger className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-600 text-sm">
                        <Select.ValueText>
                          {hourOptions.find((opt) => opt.value === localFilters.startHour)?.label ||
                            "00:00"}
                        </Select.ValueText>
                        <Select.Indicator className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <span className="h-5 w-5 text-gray-500">▼</span>
                        </Select.Indicator>
                      </Select.Trigger>
                    </Select.Control>
                    <Portal>
                      <Select.Positioner>
                        <Select.Content className="z-10 mt-2 w-[var(--trigger-width)] max-h-96 overflow-auto rounded-md bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          {hourOptions.map((option) => (
                            <Select.Item
                              key={option.value}
                              item={option}
                              className="cursor-pointer select-none p-2 text-sm text-gray-700 hover:bg-slate-100 data-[highlighted]:bg-cyan-600 data-[highlighted]:text-white"
                            >
                              <Select.ItemText>{option.label}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Positioner>
                    </Portal>
                  </Select.Root>
                </div>

                <div className="flex-1 space-y-1 min-w-0">
                  <div className="block text-sm font-medium text-gray-700">End Hour</div>
                  <Select.Root
                    collection={hourCollection}
                    value={[localFilters.endHour]}
                    onValueChange={({ value }) => updateHour("endHour", value[0])}
                  >
                    <Select.Control>
                      <Select.Trigger className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-600 text-sm">
                        <Select.ValueText>
                          {hourOptions.find((opt) => opt.value === localFilters.endHour)?.label ||
                            "23:59"}
                        </Select.ValueText>
                        <Select.Indicator className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                          <span className="h-5 w-5 text-gray-500">▼</span>
                        </Select.Indicator>
                      </Select.Trigger>
                    </Select.Control>
                    <Portal>
                      <Select.Positioner>
                        <Select.Content className="z-10 mt-2 w-[var(--trigger-width)] max-h-96 overflow-auto rounded-md bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          {hourOptions.map((option) => (
                            <Select.Item
                              key={option.value}
                              item={option}
                              className="cursor-pointer select-none p-2 text-sm text-gray-700 hover:bg-slate-100 data-[highlighted]:bg-cyan-600 data-[highlighted]:text-white"
                            >
                              <Select.ItemText>{option.label}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Positioner>
                    </Portal>
                  </Select.Root>
                </div>
              </div>
            </div>
          </div>

          {paginatedVisitorIds.length > 0 && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-gray-700">Select Individual User</h3>
                <div className="flex items-center space-x-2 text-sm">
                  <button
                    onClick={prevUserPage}
                    disabled={currentUserPage === 0}
                    className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  <span>
                    Page {currentUserPage + 1} of {totalUserPages}
                  </span>
                  <button
                    onClick={nextUserPage}
                    disabled={currentUserPage >= totalUserPages - 1}
                    className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <Select.Root
                  collection={createListCollection({
                    items: paginatedVisitorIds.map((visitorId) => ({
                      value: visitorId,
                      label: formatVisitorId(visitorId),
                    })),
                  })}
                  value={localFilters.selectedUserId ? [localFilters.selectedUserId] : []}
                  onValueChange={({ value }) => updateSelectedUser(value[0])}
                >
                  <Select.Control>
                    <Select.Trigger className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-600 text-sm">
                      <Select.ValueText placeholder="Select user">
                        {localFilters.selectedUserId
                          ? formatVisitorId(localFilters.selectedUserId)
                          : "Select user"}
                      </Select.ValueText>
                      <Select.Indicator className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <span className="h-5 w-5 text-gray-500">▼</span>
                      </Select.Indicator>
                    </Select.Trigger>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content className="z-10 mt-2 w-[var(--trigger-width)] max-h-96 overflow-auto rounded-md bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        {paginatedVisitorIds.length > 0 ? (
                          paginatedVisitorIds.map((visitorId) => (
                            <Select.Item
                              key={visitorId}
                              item={{ value: visitorId, label: formatVisitorId(visitorId) }}
                              className="cursor-pointer select-none p-2 text-sm text-gray-700 hover:bg-slate-100 data-[highlighted]:bg-cyan-600 data-[highlighted]:text-white"
                            >
                              <Select.ItemText>{formatVisitorId(visitorId)}</Select.ItemText>
                              <Select.ItemIndicator className="absolute inset-y-0 right-0 flex items-center pr-3">
                                <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-gray-500">No users available</div>
                        )}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </div>

              {localFilters.selectedUserId && (
                <div className="mt-2 text-sm bg-cyan-50 p-2 rounded">
                  <p className="font-medium">
                    Selected User: {formatVisitorId(localFilters.selectedUserId)}
                  </p>
                  <p className="text-xs text-cyan-700">
                    {localFilters.visitorType === "known"
                      ? "Known lead"
                      : localFilters.visitorType === "anonymous"
                        ? "Anonymous visitor"
                        : "Visitor (mixed)"}
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={updateDateRange}
              className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              disabled={!startDate || !endDate}
            >
              Apply Filters
            </button>
          </div>

          {$epinetCustomFilters.enabled && (
            <div className="p-2 bg-cyan-50 text-cyan-800 rounded-md text-sm">
              {$epinetCustomFilters.startHour !== null && $epinetCustomFilters.endHour !== null ? (
                <div>
                  <p>
                    {startDate && endDate
                      ? `Showing data from ${formatDateHourDisplay(startDate, localFilters.startHour)} to ${formatDateHourDisplay(endDate, localFilters.endHour)}`
                      : `Showing data from last ${getActiveFilterDescription()}`}{" "}
                    for{" "}
                    {$epinetCustomFilters.selectedUserId
                      ? `individual user ${formatVisitorId($epinetCustomFilters.selectedUserId)}`
                      : $epinetCustomFilters.visitorType === "all"
                        ? "all visitors"
                        : $epinetCustomFilters.visitorType === "anonymous"
                          ? "anonymous visitors"
                          : "known leads"}
                  </p>
                  <p className="text-xs mt-1 text-cyan-700">
                    <span className="font-semibold">Note:</span> Time ranges are converted to UTC
                    for data retrieval, but displayed in your local time.
                  </p>
                </div>
              ) : (
                <p>Select date range and filters to preview</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EpinetDurationSelector;
