import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { analyticsStore, analyticsDuration, epinetCustomFilters } from "@/store/storykeep";
import { MAX_ANALYTICS_HOURS } from "@/constants";
import { createListCollection } from "@ark-ui/react/collection";
import { Select } from "@ark-ui/react/select";
import { RadioGroup } from "@ark-ui/react/radio-group";
import { Portal } from "@ark-ui/react/portal";
import EpinetTableView from "./EpinetTableView";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import ChevronLeftIcon from "@heroicons/react/24/outline/ChevronLeftIcon";
import ChevronRightIcon from "@heroicons/react/24/outline/ChevronRightIcon";

const getHourOptions = () => {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString().padStart(2, "0"),
    label: `${i.toString().padStart(2, "0")}:00`,
    sortOrder: i,
  }));
  hours.push({ value: "24", label: "23:59", sortOrder: 24 });
  hours.sort((a, b) => a.sortOrder - b.sortOrder);
  return hours.map(({ value, label }) => ({ value, label }));
};

const hourOptions = getHourOptions();

const EpinetDurationSelector = () => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [currentUserPage, setCurrentUserPage] = useState(0);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    const now = new Date();
    const endDate = new Date(now);
    let startDate = new Date(endDate);
    if ($analyticsDuration === "daily") {
      startDate.setDate(startDate.getDate() - 1);
    } else if ($analyticsDuration === "weekly") {
      startDate.setDate(startDate.getDate() - 7);
    } else if ($analyticsDuration === "monthly") {
      startDate.setDate(startDate.getDate() - 28);
    }
    setStartDate(startDate);
    setEndDate(endDate);
    const currentHour = now.getHours().toString().padStart(2, "0");
    setLocalFilters((prev) => ({
      ...prev,
      startHour: currentHour,
      endHour: currentHour,
    }));
  }, [$analyticsDuration]);

  useEffect(() => {
    setLocalFilters((prev) => ({
      ...prev,
      visitorType: $epinetCustomFilters.visitorType || "all",
      selectedUserId: $epinetCustomFilters.selectedUserId,
    }));
  }, [$epinetCustomFilters]);

  useEffect(() => {
    setCurrentUserPage(0);
  }, [localFilters.visitorType]);

  const visitorTypes = [
    { id: "all", title: "All Traffic", description: "All visitors" },
    { id: "anonymous", title: "Anonymous", description: "Anonymous visitors" },
    { id: "known", title: "Known Leads", description: "Known visitors" },
  ] as const;

  const updateVisitorType = (type: "all" | "anonymous" | "known") => {
    setLocalFilters((prev) => ({
      ...prev,
      visitorType: type,
      selectedUserId: null,
    }));
    setHasLocalChanges(true);
  };

  const updateSelectedUser = (userId: string | null) => {
    setLocalFilters((prev) => ({ ...prev, selectedUserId: userId }));
    setHasLocalChanges(true);
  };

  const updateHour = (type: "startHour" | "endHour", hour: string) => {
    setLocalFilters((prev) => ({ ...prev, [type]: hour }));
    setHasLocalChanges(true);
    setErrorMessage(null);
  };

  const getLocalDateTime = (date: Date, hourStr: string) => {
    const result = new Date(date);
    const hour = hourStr === "24" ? 23 : parseInt(hourStr);
    const minute = hourStr === "24" ? 59 : 0;
    result.setHours(hour, minute, 0, 0);
    return result;
  };

  const getUtcDateTime = (localDate: Date) => {
    return new Date(
      Date.UTC(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate(),
        localDate.getHours(),
        localDate.getMinutes(),
        localDate.getSeconds(),
        localDate.getMilliseconds()
      )
    );
  };

  const updateDateRange = () => {
    if (!startDate || !endDate) {
      setErrorMessage("Please select both start and end dates.");
      return;
    }

    const startLocalTime = getLocalDateTime(startDate, localFilters.startHour);
    const endLocalTime = getLocalDateTime(endDate, localFilters.endHour);

    if (endLocalTime < startLocalTime) {
      setErrorMessage("End time cannot be earlier than start time.");
      return;
    }

    const startUtcTime = getUtcDateTime(startLocalTime);
    const endUtcTime = getUtcDateTime(endLocalTime);

    const nowUtc = new Date();

    let startHoursHence = Math.round(
      (nowUtc.getTime() - startUtcTime.getTime()) / (1000 * 60 * 60)
    );
    let endHoursHence = Math.round((nowUtc.getTime() - endUtcTime.getTime()) / (1000 * 60 * 60));

    startHoursHence = Math.min(startHoursHence, MAX_ANALYTICS_HOURS);
    endHoursHence = Math.max(0, Math.min(endHoursHence, MAX_ANALYTICS_HOURS));

    epinetCustomFilters.set({
      ...$epinetCustomFilters,
      visitorType: localFilters.visitorType,
      selectedUserId: localFilters.selectedUserId,
      startHour: startHoursHence,
      endHour: endHoursHence,
    });

    setHasLocalChanges(false);
    setErrorMessage(null);
  };

  const handleDateChange = (type: "start" | "end", dateValue: string | null) => {
    if (!dateValue) {
      setErrorMessage("Please select a valid date.");
      return;
    }

    const newDate = new Date(
      parseInt(dateValue.split("-")[0]),
      parseInt(dateValue.split("-")[1]) - 1,
      parseInt(dateValue.split("-")[2])
    );

    const nowUtc = new Date();
    const hoursSince = Math.round((nowUtc.getTime() - newDate.getTime()) / (1000 * 60 * 60));

    if (hoursSince > MAX_ANALYTICS_HOURS) {
      setErrorMessage(`Date cannot be more than ${MAX_ANALYTICS_HOURS} hours in the past.`);
      return;
    }

    if (type === "start") {
      setStartDate(newDate);
    } else {
      setEndDate(newDate);
    }

    setHasLocalChanges(true);
    setErrorMessage(null);
  };

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return "Select date";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateHourDisplay = (date: Date, hourStr: string) => {
    if (!date) return "";

    const localDateTime = getLocalDateTime(date, hourStr);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return (
      localDateTime.toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone,
      }) + ` (${timeZone})`
    );
  };

  const paginatedUserCounts = ($epinetCustomFilters.userCounts || []).slice(
    currentUserPage * usersPerPage,
    (currentUserPage + 1) * usersPerPage
  );

  const totalUserPages = Math.ceil(
    (($epinetCustomFilters.userCounts || []).length || 0) / usersPerPage
  );

  const nextUserPage = () => {
    if (currentUserPage < totalUserPages - 1) setCurrentUserPage(currentUserPage + 1);
  };

  const prevUserPage = () => {
    if (currentUserPage > 0) setCurrentUserPage(currentUserPage - 1);
  };

  const maxDate = new Date();
  const minDate = new Date();
  minDate.setHours(minDate.getHours() - MAX_ANALYTICS_HOURS);

  const setPresetDateRange = (period: string) => {
    const now = new Date();
    const endDate = new Date(now);
    const startDate = new Date(endDate);

    if (period === "24h") {
      startDate.setDate(startDate.getDate() - 1);
    } else if (period === "7d") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "28d") {
      startDate.setDate(startDate.getDate() - 28);
    }

    setStartDate(startDate);
    setEndDate(endDate);

    const currentHour = now.getHours().toString().padStart(2, "0");
    setLocalFilters((prev) => ({
      ...prev,
      startHour: currentHour,
      endHour: currentHour,
    }));

    setIsDatePickerOpen(false);
    setHasLocalChanges(true);
    setErrorMessage(null);
  };

  const cancelChanges = () => {
    const now = new Date();
    setLocalFilters({
      visitorType: $epinetCustomFilters.visitorType || "all",
      selectedUserId: $epinetCustomFilters.selectedUserId || null,
      startHour: now.getHours().toString().padStart(2, "0"),
      endHour: now.getHours().toString().padStart(2, "0"),
    });

    const endDate = new Date(now);
    let startDate = new Date(endDate);

    if ($analyticsDuration === "daily") {
      startDate.setDate(startDate.getDate() - 1);
    } else if ($analyticsDuration === "weekly") {
      startDate.setDate(startDate.getDate() - 7);
    } else if ($analyticsDuration === "monthly") {
      startDate.setDate(startDate.getDate() - 28);
    }

    setStartDate(startDate);
    setEndDate(endDate);
    setIsDatePickerOpen(false);
    setHasLocalChanges(false);
    setErrorMessage(null);
  };

  const radioGroupStyles = `
    .radio-control[data-state="unchecked"] .radio-dot { background-color: #d1d5db; }
    .radio-control[data-state="checked"] .radio-dot { background-color: #0891b2; }
    .radio-control[data-state="checked"] { border-color: #0891b2; }
    .radio-item { border: 1px solid #d1d5db; }
    .radio-item[data-state="checked"] { border-color: #0891b2; }
    .radio-item:hover { background-color: #f3f4f6; }
    @media (max-width: 640px) { .radio-item { flex: 1 1 100%; } }
    @media (min-width: 641px) { .radio-item { flex: 1 1 calc(33.333% - 0.5rem); } }
  `;

  const getFilterStatusMessage = () => {
    const needsApply = hasLocalChanges;
    const prefix = needsApply ? "Press Apply Filters to load" : "Showing";
    let baseMessage =
      startDate && endDate
        ? `${prefix} from ${formatDateHourDisplay(startDate, localFilters.startHour)} to ${formatDateHourDisplay(endDate, localFilters.endHour)}`
        : `${prefix} from last ${
            $analyticsDuration === "daily"
              ? "24 hours"
              : $analyticsDuration === "weekly"
                ? "7 days"
                : "28 days"
          }`;

    if (!startDate || !endDate) {
      baseMessage = "Apply date filter for visualization";
    }

    const userInfo = needsApply
      ? localFilters.selectedUserId
        ? ` for individual user ${localFilters.selectedUserId}`
        : ` for ${
            localFilters.visitorType === "all"
              ? "all visitors"
              : localFilters.visitorType === "anonymous"
                ? "anonymous visitors"
                : "known leads"
          }`
      : $epinetCustomFilters.selectedUserId
        ? ` for individual user ${$epinetCustomFilters.selectedUserId}`
        : ` for ${
            $epinetCustomFilters.visitorType === "all"
              ? "all visitors"
              : $epinetCustomFilters.visitorType === "anonymous"
                ? "anonymous visitors"
                : "known leads"
          }`;

    return baseMessage + userInfo;
  };

  return (
    <div className="space-y-4">
      {$epinetCustomFilters.enabled && (
        <div
          className={`border-2 border-dashed border-gray-200 bg-gray-50 p-4 rounded-lg space-y-4`}
        >
          <div className="flex flex-col space-y-4 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
            <div className="space-y-2">
              <style>{radioGroupStyles}</style>
              <RadioGroup.Root
                value={localFilters.visitorType}
                onValueChange={({ value }) =>
                  updateVisitorType(value as "all" | "anonymous" | "known")
                }
                aria-label="Select visitor type"
              >
                <RadioGroup.Label className="sr-only">Visitor Type</RadioGroup.Label>
                <div className="flex flex-wrap gap-2">
                  {visitorTypes.map((type) => (
                    <RadioGroup.Item
                      key={type.id}
                      value={type.id}
                      className="radio-item bg-white relative flex cursor-pointer rounded-lg px-4 py-2 focus:outline-none"
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
              <div className="block text-sm font-bold text-gray-700">Date Range</div>
              <div className="relative">
                <button
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm text-left"
                  aria-label="Toggle date range picker"
                >
                  {startDate && endDate
                    ? `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`
                    : "Select date range"}
                </button>

                {isDatePickerOpen && (
                  <div className="absolute z-10 mt-1 bg-white rounded-md shadow-lg p-2 w-full sm:w-auto">
                    <div className="flex flex-wrap gap-2 justify-between mb-2">
                      <button
                        className="p-1 rounded-md hover:bg-gray-100 text-sm"
                        onClick={() => setPresetDateRange("24h")}
                      >
                        Last 24 hours
                      </button>
                      <button
                        className="p-1 rounded-md hover:bg-gray-100 text-sm"
                        onClick={() => setPresetDateRange("7d")}
                      >
                        Last 7 days
                      </button>
                      <button
                        className="p-1 rounded-md hover:bg-gray-100 text-sm"
                        onClick={() => setPresetDateRange("28d")}
                      >
                        Last 28 days
                      </button>
                      <button
                        className="p-1 rounded-md hover:bg-gray-100 text-sm"
                        onClick={() => setIsDatePickerOpen(false)}
                      >
                        Close
                      </button>
                    </div>

                    <div className="mb-2">
                      <p className="text-sm font-bold">
                        Start date: {formatDateDisplay(startDate)}
                      </p>
                      <p className="text-sm font-bold">End date: {formatDateDisplay(endDate)}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <label htmlFor="start-date" className="block text-sm font-bold">
                          Start
                        </label>
                        <input
                          id="start-date"
                          type="date"
                          className="w-full px-2 py-1 border rounded"
                          onChange={(e) => handleDateChange("start", e.target.value)}
                          value={startDate ? startDate.toISOString().split("T")[0] : ""}
                          min={minDate.toISOString().split("T")[0]}
                          max={maxDate.toISOString().split("T")[0]}
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="end-date" className="block text-sm font-bold">
                          End
                        </label>
                        <input
                          id="end-date"
                          type="date"
                          className="w-full px-2 py-1 border rounded"
                          onChange={(e) => handleDateChange("end", e.target.value)}
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
              <div className="block text-sm font-bold text-gray-700">Hour Range</div>
              <div className="flex flex-row gap-4">
                <div className="flex flex-row gap-4">
                  <div className="flex-1 space-y-1 min-w-0">
                    <label htmlFor="start-hour" className="block text-sm font-bold text-gray-700">
                      Start Hour
                    </label>
                    <select
                      id="start-hour"
                      value={localFilters.startHour}
                      onChange={(e) => updateHour("startHour", e.target.value)}
                      className="w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-600 text-sm"
                    >
                      {hourOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 space-y-1 min-w-0">
                    <label htmlFor="end-hour" className="block text-sm font-bold text-gray-700">
                      End Hour
                    </label>
                    <select
                      id="end-hour"
                      value={localFilters.endHour}
                      onChange={(e) => updateHour("endHour", e.target.value)}
                      className="w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-600 text-sm"
                    >
                      {hourOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-2 p-2 bg-red-50 text-red-800 rounded-md text-sm">{errorMessage}</div>
          )}

          {paginatedUserCounts.length > 0 && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm max-w-md">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-gray-700">View Individual User Journey</h3>
                {totalUserPages > 1 && (
                  <div className="flex items-center space-x-2 text-sm">
                    <button
                      onClick={prevUserPage}
                      disabled={currentUserPage === 0}
                      className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
                      aria-label="Previous page"
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
                      aria-label="Next page"
                    >
                      <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-2">
                <Select.Root
                  collection={createListCollection({
                    items: [
                      { value: "", label: "Select user" },
                      ...paginatedUserCounts.map((user) => ({
                        value: user.id,
                        label: `${user.id} (${user.count} events)`,
                      })),
                    ],
                  })}
                  value={localFilters.selectedUserId ? [localFilters.selectedUserId] : [""]}
                  onValueChange={({ value }) => updateSelectedUser(value[0] || null)}
                >
                  <Select.Label className="sr-only">Select user</Select.Label>
                  <Select.Control>
                    <Select.Trigger
                      className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-600 text-sm"
                      aria-label="Select individual user"
                    >
                      <Select.ValueText placeholder="Select user">
                        {localFilters.selectedUserId ? localFilters.selectedUserId : "Select user"}
                      </Select.ValueText>
                      <Select.Indicator className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <span className="h-5 w-5 text-gray-500">▼</span>
                      </Select.Indicator>
                    </Select.Trigger>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content className="z-10 mt-2 w-[var(--trigger-width)] max-h-96 overflow-auto rounded-md bg-white text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        {paginatedUserCounts.length > 0 ? (
                          [
                            <Select.Item
                              key="empty"
                              item={{ value: "", label: "Select user" }}
                              className="cursor-pointer select-none p-2 text-sm text-gray-500 hover:bg-slate-100 data-[highlighted]:bg-cyan-600 data-[highlighted]:text-white"
                            >
                              <Select.ItemText>Select user</Select.ItemText>
                            </Select.Item>,
                            ...paginatedUserCounts.map((user) => (
                              <Select.Item
                                key={user.id}
                                item={{
                                  value: user.id,
                                  label: `${user.id} (${user.count} events)`,
                                }}
                                className="cursor-pointer select-none p-2 text-sm text-gray-700 hover:bg-slate-100 data-[highlighted]:bg-cyan-600 data-[highlighted]:text-white"
                              >
                                <Select.ItemText>
                                  {user.id}{" "}
                                  <span className="text-xs text-gray-500">
                                    ({user.count} events)
                                  </span>
                                </Select.ItemText>
                              </Select.Item>
                            )),
                          ]
                        ) : (
                          <div className="p-2 text-sm text-gray-500">No users available</div>
                        )}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </div>
            </div>
          )}

          {$epinetCustomFilters.enabled && (
            <div
              className={`p-2 ${
                hasLocalChanges ? `bg-cyan-50` : `font-bold`
              } text-cyan-800 rounded-md text-sm`}
            >
              <p>{getFilterStatusMessage()}</p>
              {!hasLocalChanges && (
                <p className="mt-1 text-sm">
                  Total events:{" "}
                  {analyticsStore.get().epinet?.links?.reduce((sum, link) => sum + link.value, 0) ||
                    0}
                </p>
              )}
              {hasLocalChanges && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={updateDateRange}
                    className="px-3 py-1 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-bold"
                    disabled={!startDate || !endDate}
                    aria-label="Apply filters"
                  >
                    Apply Filters
                  </button>
                  <button
                    onClick={cancelChanges}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-bold"
                    aria-label="Cancel changes"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          <EpinetTableView />
        </div>
      )}
    </div>
  );
};

export default EpinetDurationSelector;
