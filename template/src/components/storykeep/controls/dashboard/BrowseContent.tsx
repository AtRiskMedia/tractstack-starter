import { useState, useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import { Switch } from "@headlessui/react";
import CheckIcon from "@heroicons/react/20/solid/CheckIcon";
import ChevronUpDownIcon from "@heroicons/react/20/solid/ChevronUpDownIcon";
import { analyticsStore, homeSlugStore } from "@/store/storykeep.ts";
import { classNames } from "@/utils/common/helpers.ts";
import type { FullContentMap, HotItem } from "@/types.ts";

const BrowsePages = ({ contentMap = [] }: { contentMap?: FullContentMap[] }) => {
  const [isClient, setIsClient] = useState(false);
  const [showMostActive, setShowMostActive] = useState(false);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(-1); // Track focused item in dropdown
  const itemsPerPage = 16;

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const analytics = useStore(analyticsStore);
  const dashboard = analytics.dashboard;
  const hotContent = dashboard?.hot_content || [];
  const $homeSlug = useStore(homeSlugStore);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (analytics.status === "loading" || analytics.status === "refreshing") {
      setIsAnalyticsLoading(true);
    } else {
      setIsAnalyticsLoading(false);
    }
  }, [analytics.status]);

  useEffect(() => {
    setCurrentPage(1); // Reset pagination when filters change
    setFocusedIndex(-1); // Reset focused index when query changes
  }, [query, showMostActive]);

  const safeContentMap = Array.isArray(contentMap) ? contentMap : [];

  const filteredPages = safeContentMap
    .filter((item) => {
      const matchesType =
        item?.type === "StoryFragment" || (item?.type === "Pane" && item?.isContext === true);
      const matchesQuery =
        !query || (item?.title || "").toLowerCase().includes(query.toLowerCase());
      return matchesType && matchesQuery;
    })
    .sort((a, b) => {
      if (showMostActive && hotContent && hotContent.length > 0) {
        const aEvents = hotContent.find((h: HotItem) => h.id === a.id)?.total_events || 0;
        const bEvents = hotContent.find((h: HotItem) => h.id === b.id)?.total_events || 0;
        return bEvents - aEvents;
      }
      return 0;
    });

  const totalPages = Math.ceil(filteredPages.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedPages = filteredPages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getContentUrl = (page: FullContentMap, isEdit = false) => {
    const basePath =
      page.type === "Pane" && page.isContext ? `/context/${page.slug}` : `/${page.slug}`;
    return isEdit ? `${basePath}/edit` : basePath;
  };

  const getEventCount = (pageId: string): number => {
    if (!hotContent || hotContent.length === 0) return 0;
    return hotContent.find((h: HotItem) => h.id === pageId)?.total_events || 0;
  };

  const handleItemSelect = (page: FullContentMap) => {
    setQuery(page.title);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!query || filteredPages.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev < filteredPages.length - 1 ? prev + 1 : 0;
          listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
          return next;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : filteredPages.length - 1;
          listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
          return next;
        });
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredPages.length) {
          handleItemSelect(filteredPages[focusedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setQuery("");
        setFocusedIndex(-1);
        inputRef.current?.focus();
        break;
      case "Tab":
        // Allow Tab to move focus out, but close dropdown
        setQuery("");
        setFocusedIndex(-1);
        break;
    }
  };

  if (!isClient) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold font-action px-3.5">Browse Pages</h3>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between px-3.5 space-y-4 md:space-y-0 md:space-x-6">
        <div className="relative w-full md:w-1/3 xl:w-1/4">
          <div className="w-full relative">
            <input
              ref={inputRef}
              className="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-black shadow-sm ring-1 ring-inset ring-myblack/20 focus:ring-2 focus:ring-inset focus:ring-cyan-600 text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages..."
              role="combobox"
              aria-expanded={query !== "" && filteredPages.length > 0}
              aria-controls="page-options"
              aria-activedescendant={
                focusedIndex >= 0 ? `page-option-${filteredPages[focusedIndex].id}` : undefined
              }
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-myblack/60" aria-hidden="true" />
            </div>
          </div>

          {query && filteredPages.length > 0 && (
            <ul
              ref={listRef}
              id="page-options"
              className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm"
              role="listbox"
              tabIndex={-1}
            >
              {filteredPages.map((page, index) => (
                <li
                  id={`page-option-${page.id}`}
                  key={page.id}
                  className={classNames(
                    "relative cursor-pointer select-none py-2 pl-3 pr-9",
                    focusedIndex === index
                      ? "bg-cyan-600 text-white"
                      : "hover:bg-cyan-600/10 hover:text-black text-black"
                  )}
                  onClick={() => handleItemSelect(page)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleItemSelect(page);
                    }
                  }}
                  role="option"
                  aria-selected={page.title === query}
                  tabIndex={-1}
                >
                  <span className="block truncate">{page.title}</span>
                  {page.title === query && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-cyan-600">
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-6">
          <Switch.Group as="div" className="flex items-center whitespace-nowrap">
            <Switch
              checked={showMostActive}
              onChange={setShowMostActive}
              className={classNames(
                showMostActive ? "bg-cyan-600" : "bg-gray-200",
                "relative inline-flex flex-shrink-0 h-5 w-10 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-600"
              )}
            >
              <span
                aria-hidden="true"
                className={classNames(
                  showMostActive ? "translate-x-5" : "translate-x-0",
                  "pointer-events-none absolute inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition-transform ease-in-out duration-200"
                )}
              />
            </Switch>
            <Switch.Label as="span" className="ml-3 text-sm">
              Sort by Most Active
            </Switch.Label>
          </Switch.Group>
        </div>
      </div>

      {filteredPages.length === 0 ? (
        <div className="text-center py-12 text-mydarkgrey">No pages found</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedPages.map((page) => {
              const events = getEventCount(page.id);

              return (
                <div
                  key={page.id}
                  className="bg-mywhite rounded-lg shadow p-2 flex items-center space-x-3"
                >
                  <div className="relative w-1/3" style={{ paddingBottom: "17.5%" }}>
                    <img
                      src={`thumbSrc` in page && page.thumbSrc ? page.thumbSrc : "/static.jpg"}
                      srcSet={
                        `thumbSrcSet` in page && page.thumbSrcSet ? page.thumbSrcSet : undefined
                      }
                      alt={page.title}
                      className="absolute inset-0 w-full h-full object-cover rounded-md"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="text-sm text-black truncate">{page.title}</div>
                    <div className="text-xs text-mydarkgrey truncate">
                      {page.slug}
                      {page.type === "Pane" && page.isContext && " (Context Page)"}
                    </div>
                    {page.slug === $homeSlug && (
                      <span className="inline-flex w-fit items-center rounded-full bg-cyan-600 px-1 py-0.5 text-xs font-bold text-slate-100">
                        Home
                      </span>
                    )}
                    <div className="text-xs text-mydarkgrey flex justify-between items-center mt-1">
                      <span>
                        {isAnalyticsLoading ? (
                          <span className="inline-flex items-center">
                            <span className="animate-pulse text-cyan-600">Loading events...</span>
                          </span>
                        ) : (
                          `${events} events`
                        )}
                      </span>
                      <span className="flex space-x-1">
                        <a
                          href={getContentUrl(page)}
                          className="pl-2 text-cyan-600 hover:text-cyan-600 text-lg underline"
                          title="Visit this Page"
                        >
                          Visit
                        </a>
                        {` `}
                        <a
                          href={getContentUrl(page, true)}
                          className="pl-2 text-cyan-600 hover:text-cyan-600 text-lg underline"
                          title="Edit this Page"
                        >
                          Edit
                        </a>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-x-2 mt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={classNames(
                    "px-3 py-1 rounded-md text-sm",
                    currentPage === page
                      ? "bg-cyan-600 text-white"
                      : "bg-white text-mydarkgrey hover:bg-cyan-600/10"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BrowsePages;
