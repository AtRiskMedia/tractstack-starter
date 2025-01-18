import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { Combobox } from "@headlessui/react";
import { Switch } from "@headlessui/react";
import CursorArrowRippleIcon from "@heroicons/react/24/outline/CursorArrowRippleIcon";
import BeakerIcon from "@heroicons/react/24/outline/BeakerIcon";
import CheckIcon from "@heroicons/react/20/solid/CheckIcon";
import ChevronUpDownIcon from "@heroicons/react/20/solid/ChevronUpDownIcon";
import { storedDashboardAnalytics } from "@/store/storykeep.ts";
import { classNames } from "@/utils/common/helpers.ts";
import type { FullContentMap, HotItem } from "@/types.ts";

const BrowsePages = ({ contentMap = [] }: { contentMap?: FullContentMap[] }) => {
  const [isClient, setIsClient] = useState(false);
  const [showMostActive, setShowMostActive] = useState(false);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const $storedDashboardAnalytics = useStore(storedDashboardAnalytics);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Ensure we have a valid array to work with
  const safeContentMap = Array.isArray(contentMap) ? contentMap : [];

  // Filter content to include both StoryFragments and Panes with isContext=true
  const filteredPages = safeContentMap
    .filter((item) => {
      const matchesType =
        item?.type === "StoryFragment" || (item?.type === "Pane" && item?.isContext === true);
      const matchesQuery =
        !query || (item?.title || "").toLowerCase().includes(query.toLowerCase());
      return matchesType && matchesQuery;
    })
    .sort((a, b) => {
      if (showMostActive && $storedDashboardAnalytics?.hot_content) {
        const aEvents =
          $storedDashboardAnalytics.hot_content.find((h: HotItem) => h.id === a.id)?.total_events ||
          0;
        const bEvents =
          $storedDashboardAnalytics.hot_content.find((h: HotItem) => h.id === b.id)?.total_events ||
          0;
        return bEvents - aEvents;
      }
      return 0;
    });

  const totalPages = Math.ceil(filteredPages.length / itemsPerPage);
  const paginatedPages = filteredPages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!isClient) return null;

  // Helper function to generate the correct URL based on content type
  const getContentUrl = (page: FullContentMap, isEdit = false) => {
    const basePath =
      page.type === "Pane" && page.isContext ? `/context/${page.slug}` : `/${page.slug}`;
    return isEdit ? `${basePath}/edit` : basePath;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold font-action px-3.5">Browse Pages</h3>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between px-3.5 space-y-4 md:space-y-0 md:space-x-6">
        <div className="relative w-full md:w-1/3 xl:w-1/4">
          <Combobox
            onChange={(item: FullContentMap | string) => {
              if (typeof item === "string") {
                setQuery(item);
              } else if (item?.title) {
                setQuery(item.title);
              }
            }}
            nullable
          >
            <Combobox.Input
              className="w-full rounded-md border-0 bg-white py-1.5 pl-3 pr-10 text-black shadow-sm ring-1 ring-inset ring-myblack/20 focus:ring-2 focus:ring-inset focus:ring-myorange text-sm"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages..."
              value={query}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-myblack/60" aria-hidden="true" />
            </Combobox.Button>

            {query && filteredPages.length > 0 && (
              <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {filteredPages.map((page) => (
                  <Combobox.Option
                    key={page.id}
                    value={page}
                    className={({ active }) =>
                      classNames(
                        "relative cursor-default select-none py-2 pl-3 pr-9",
                        active ? "bg-myorange/10 text-black" : "text-mydarkgrey"
                      )
                    }
                  >
                    {({ selected }) => (
                      <>
                        <span className={classNames("block truncate", selected ? "font-bold" : "")}>
                          {page.title}
                        </span>
                        {selected && (
                          <span
                            className={classNames(
                              "absolute inset-y-0 right-0 flex items-center pr-4"
                            )}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            )}
          </Combobox>
        </div>

        <div className="flex flex-wrap items-center gap-x-6">
          <Switch.Group as="div" className="flex items-center whitespace-nowrap">
            <Switch
              checked={showMostActive}
              onChange={setShowMostActive}
              className={classNames(
                showMostActive ? "bg-myblue" : "bg-gray-200",
                "relative inline-flex flex-shrink-0 h-5 w-10 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myblue"
              )}
            >
              <span
                aria-hidden="true"
                className={`${showMostActive ? "translate-x-5" : "translate-x-0"} pointer-events-none absolute inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition-transform ease-in-out duration-200`}
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
          <div className="bg-mywhite rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-mylightgrey/20">
              <thead className="bg-mylightgrey/20">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider w-32"
                  >
                    Preview
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider"
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
                    Type
                  </th>
                  {showMostActive && (
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider"
                    >
                      Events
                    </th>
                  )}
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs text-mydarkgrey uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-mywhite divide-y divide-mylightgrey/10">
                {paginatedPages.map((page) => {
                  const events = showMostActive
                    ? $storedDashboardAnalytics?.hot_content?.find((h: HotItem) => h.id === page.id)
                        ?.total_events || 0
                    : null;

                  return (
                    <tr key={page.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <img
                          src={
                            `socialImagePath` in page && page.socialImagePath
                              ? page.socialImagePath
                              : "/static.jpg"
                          }
                          alt={page.title}
                          className="w-24 h-14 object-cover rounded-md"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-myblack truncate max-w-xs">{page.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-mydarkgrey truncate max-w-xs">{page.slug}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-mydarkgrey">
                          {page.type === "Pane" && page.isContext ? "Context" : "Page"}
                        </div>
                      </td>
                      {showMostActive && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-mydarkgrey">{events}</div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                        <a
                          href={getContentUrl(page)}
                          className="text-myblue hover:text-myorange mr-3 inline-block"
                          title="View"
                        >
                          <CursorArrowRippleIcon className="h-5 w-5" />
                        </a>
                        <a
                          href={getContentUrl(page, true)}
                          className="text-myblue hover:text-myorange inline-block"
                          title="Edit"
                        >
                          <BeakerIcon className="h-5 w-5" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                      ? "bg-myblue text-white"
                      : "bg-white text-mydarkgrey hover:bg-myorange/10"
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
