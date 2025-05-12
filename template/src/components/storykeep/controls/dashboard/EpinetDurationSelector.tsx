import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { analyticsStore, analyticsDuration, epinetCustomFilters } from "@/store/storykeep";
import { MAX_ANALYTICS_HOURS } from "@/constants";
import { Select, createListCollection } from "@ark-ui/react";
import { RadioGroup } from "@ark-ui/react/radio-group";
import { Portal } from "@ark-ui/react/portal";
import EpinetTableView from "./EpinetTableView";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import ChevronLeftIcon from "@heroicons/react/24/outline/ChevronLeftIcon";
import ChevronRightIcon from "@heroicons/react/24/outline/ChevronRightIcon";

// Generate hour options with local time labels but UTC hour values
const getHourOptions = () => {
  const now = new Date();
  const offsetHours = Math.floor(now.getTimezoneOffset() / 60); // e.g., 4 for Toronto (UTC-4)
  return [
    ...Array.from({ length: 24 }, (_, i) => {
      const utcHour = i;
      const localHour = (i - offsetHours + 24) % 24; // Convert UTC hour to local
      return {
        value: utcHour.toString().padStart(2, "0"),
        label: `${localHour.toString().padStart(2, "0")}:00`,
      };
    }),
    {
      value: "23:59",
      label: `${((23 - offsetHours + 24) % 24).toString().padStart(2, "0")}:59`,
    },
  ];
};

const hourOptions = getHourOptions();
const hourCollection = createListCollection({ items: hourOptions });

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

  // Initialize dates based on analytics duration, using UTC hours
  useEffect(() => {
    const now = new Date();
    const currentUtcHour = now.getUTCHours(); // Align with UTC bins
    const endDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())
    );
    let startDate = new Date(endDate);

    if ($analyticsDuration === "daily") {
      startDate.setUTCHours(endDate.getUTCHours() - 24);
    } else if ($analyticsDuration === "weekly") {
      startDate.setUTCHours(endDate.getUTCHours() - 168);
    } else if ($analyticsDuration === "monthly") {
      startDate.setUTCHours(endDate.getUTCHours() - 672);
    }

    setStartDate(startDate);
    setEndDate(endDate);
    setLocalFilters((prev) => ({
      ...prev,
      startHour: currentUtcHour.toString().padStart(2, "0"),
      endHour: currentUtcHour.toString().padStart(2, "0"),
    }));
  }, [$analyticsDuration]);

  // Sync local filters with global store changes
  useEffect(() => {
    setLocalFilters((prev) => ({
      ...prev,
      visitorType: $epinetCustomFilters.visitorType || "all",
      selectedUserId: $epinetCustomFilters.selectedUserId,
    }));
  }, [$epinetCustomFilters]);

  // Reset pagination on visitor type change
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

  // Apply local changes to global store with validation
  const updateDateRange = () => {
    if (!startDate || !endDate) {
      setErrorMessage("Please select both start and end dates.");
      return;
    }

    // Validate hour range
    const startHourNum = parseInt(localFilters.startHour);
    const endHourNum = localFilters.endHour === "23:59" ? 23.99 : parseInt(localFilters.endHour);
    if (startDate.toDateString() === endDate.toDateString() && endHourNum < startHourNum) {
      setErrorMessage("End hour cannot be earlier than start hour on the same day.");
      return;
    }

    // Create UTC date-times
    const startDateTime = new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
        parseInt(localFilters.startHour),
        localFilters.startHour === "23:59" ? 59 : 0,
        0,
        localFilters.startHour === "23:59" ? 999 : 0
      )
    );
    const endDateTime = new Date(
      Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate(),
        parseInt(localFilters.endHour),
        localFilters.endHour === "23:59" ? 59 : 0,
        0,
        localFilters.endHour === "23:59" ? 999 : 0
      )
    );

    const nowUtc = new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate(),
        new Date().getUTCHours()
      )
    );
    let startHoursHence = Math.round(
      (nowUtc.getTime() - startDateTime.getTime()) / (1000 * 60 * 60)
    );
    let endHoursHence = Math.round((nowUtc.getTime() - endDateTime.getTime()) / (1000 * 60 * 60));

    // Validate time range
    if (startHoursHence < endHoursHence) {
      setErrorMessage("Start time cannot be later than end time.");
      return;
    }

    // Clamp to MAX_ANALYTICS_HOURS
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
      Date.UTC(
        parseInt(dateValue.split("-")[0]),
        parseInt(dateValue.split("-")[1]) - 1,
        parseInt(dateValue.split("-")[2]),
        0,
        0,
        0,
        0
      )
    );

    // Ensure date is within MAX_ANALYTICS_HOURS
    const nowUtc = new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate(),
        new Date().getUTCHours()
      )
    );
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

    if (newDate && (type === "start" ? endDate : startDate)) {
      const otherDate = type === "start" ? endDate : startDate;
      if (
        otherDate &&
        newDate.getUTCFullYear() === otherDate.getUTCFullYear() &&
        newDate.getUTCMonth() === otherDate.getUTCMonth() &&
        newDate.getUTCDate() === otherDate.getUTCDate()
      ) {
        setLocalFilters((prev) => ({
          ...prev,
          startHour: "00",
          endHour: "23:59",
        }));
      }
    }
    setHasLocalChanges(true);
    setErrorMessage(null);
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
  minDate.setUTCHours(minDate.getUTCHours() - MAX_ANALYTICS_HOURS);

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return "Select date";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateHourDisplay = (date: Date, hour: string) => {
    const utcDate = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        parseInt(hour),
        hour === "23:59" ? 59 : 0,
        0,
        hour === "23:59" ? 999 : 0
      )
    );
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return (
      utcDate.toLocaleString(undefined, {
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

  const setPresetDateRange = (period: string) => {
    const now = new Date();
    const currentUtcHour = now.getUTCHours(); // Align with UTC bins
    const endDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())
    );
    const startDate = new Date(endDate);

    if (period === "24h") {
      startDate.setUTCHours(endDate.getUTCHours() - 24);
    } else if (period === "7d") {
      startDate.setUTCHours(endDate.getUTCHours() - 168);
    } else if (period === "28d") {
      startDate.setUTCHours(endDate.getUTCHours() - 672);
    }

    setStartDate(startDate);
    setEndDate(endDate);
    setLocalFilters((prev) => ({
      ...prev,
      startHour: currentUtcHour.toString().padStart(2, "0"),
      endHour: currentUtcHour.toString().padStart(2, "0"),
    }));
    setIsDatePickerOpen(false);
    setHasLocalChanges(true);
    setErrorMessage(null);
  };

  const cancelChanges = () => {
    const now = new Date();
    const currentUtcHour = now.getUTCHours(); // Align with UTC bins
    setLocalFilters({
      visitorType: $epinetCustomFilters.visitorType || "all",
      selectedUserId: $epinetCustomFilters.selectedUserId || null,
      startHour: currentUtcHour.toString().padStart(2, "0"),
      endHour: currentUtcHour.toString().padStart(2, "0"),
    });

    const endDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())
    );
    let startDate = new Date(endDate);

    if ($analyticsDuration === "daily") {
      startDate.setUTCHours(endDate.getUTCHours() - 24);
    } else if ($analyticsDuration === "weekly") {
      startDate.setUTCHours(endDate.getUTCHours() - 168);
    } else if ($analyticsDuration === "monthly") {
      startDate.setUTCHours(endDate.getUTCHours() - 672);
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
                <div className="flex-1 space-y-1 min-w-0">
                  <label htmlFor="start-hour" className="block text-sm font-bold text-gray-700">
                    Start Hour
                  </label>
                  <Select.Root
                    collection={hourCollection}
                    value={[localFilters.startHour]}
                    onValueChange={({ value }) => updateHour("startHour", value[0])}
                    positioning={{ sameWidth: true }}
                  >
                    <Select.Label className="sr-only">Start Hour</Select.Label>
                    <Select.Control>
                      <Select.Trigger
                        id="start-hour"
                        className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-600 text-sm"
                      >
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
                  <label htmlFor="end-hour" className="block text-sm font-bold text-gray-700">
                    End Hour
                  </label>
                  <Select.Root
                    collection={hourCollection}
                    value={[localFilters.endHour]}
                    onValueChange={({ value }) => updateHour("endHour", value[0])}
                    positioning={{ sameWidth: true }}
                  >
                    <Select.Label className="sr-only">End Hour</Select.Label>
                    <Select.Control>
                      <Select.Trigger
                        id="end-hour"
                        className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-600 text-sm"
                      >
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
                  positioning={{ sameWidth: true }}
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
