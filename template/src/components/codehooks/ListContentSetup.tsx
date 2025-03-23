import { useState, useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import { contentMap } from "@/store/events";
import { storyfragmentAnalyticsStore } from "@/store/storykeep";
import { classNames } from "@/utils/common/helpers";
import { getCtx } from "@/store/nodes";
import { cloneDeep } from "@/utils/common/helpers";
import ColorPickerCombo from "@/components/storykeep/controls/fields/ColorPickerCombo";
import type { StoryFragmentContentMap, PaneNode, Config } from "@/types";

const PER_PAGE = 20;

interface ListContentSetupProps {
  params?: Record<string, string>;
  nodeId: string;
  config?: Config;
}

const ListContentSetup = ({ params, nodeId, config }: ListContentSetupProps) => {
  const $contentMap = useStore(contentMap);
  const $analytics = useStore(storyfragmentAnalyticsStore);

  // Parse existing parameters or set defaults
  const [selectedMode, setSelectedMode] = useState(params?.defaultMode || "recent");
  const [excludedIds, setExcludedIds] = useState<string[]>(
    params?.excludedIds ? params.excludedIds.split(",") : []
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    params?.topics ? params.topics.split(",") : []
  );
  const [pageSize, setPageSize] = useState(params?.pageSize ? parseInt(params.pageSize) : 10);
  const [currentPage, setCurrentPage] = useState(1);
  const [bgColor, setBgColor] = useState(params?.bgColor || "");

  // Use a ref to track initial mount to prevent unnecessary updates
  const isInitialMount = useRef(true);

  const ctx = getCtx();

  // Get all valid story fragments, ensuring they have all required fields
  const validPages = $contentMap.filter(
    (item): item is StoryFragmentContentMap =>
      item.type === "StoryFragment" &&
      typeof item.description === "string" &&
      typeof item.thumbSrc === "string" &&
      typeof item.thumbSrcSet === "string" &&
      typeof item.changed === "string"
  );

  // Build topic map for filtering
  const topicMap = new Map<string, { count: number; pageIds: string[] }>();
  validPages.forEach((page) => {
    if (page.topics && page.topics.length > 0) {
      page.topics.forEach((topic) => {
        const topicData = topicMap.get(topic) || { count: 0, pageIds: [] };
        topicData.count += 1;
        topicData.pageIds.push(page.id);
        topicMap.set(topic, topicData);
      });
    }
  });

  const topics = Array.from(topicMap.entries())
    .map(([name, { count, pageIds }]) => ({
      name,
      count,
      pageIds,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Filter pages based on topic and exclusion logic
  const filteredPages = validPages.filter((page) => {
    // Skip if page is explicitly excluded
    if (excludedIds.includes(page.id)) {
      return false;
    }

    // If no topics selected, include all non-excluded pages
    if (selectedTopics.length === 0) {
      return true;
    }

    // Check if page has at least one of the selected topics
    return page.topics && page.topics.some((topic) => selectedTopics.includes(topic));
  });

  // Sort filtered pages according to selected mode
  const sortedPages = [...filteredPages].sort((a, b) => {
    if (selectedMode === "popular") {
      const aViews = $analytics.byId[a.id]?.total_actions || 0;
      const bViews = $analytics.byId[b.id]?.total_actions || 0;
      return bViews - aViews;
    }
    // Default to "recent"
    const bDate = b.changed ? new Date(b.changed) : new Date(0);
    const aDate = a.changed ? new Date(a.changed) : new Date(0);
    return bDate.getTime() - aDate.getTime();
  });

  // Paginate pages
  const totalPages = Math.ceil(sortedPages.length / PER_PAGE);
  const paginatedPages = sortedPages.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  // Update the pane node when configuration changes
  const updatePaneNode = () => {
    if (nodeId) {
      const allNodes = ctx.allNodes.get();
      const paneNode = cloneDeep(allNodes.get(nodeId)) as PaneNode;
      if (paneNode) {
        const updatedNode = {
          ...paneNode,
          codeHookTarget: "list-content",
          codeHookPayload: {
            options: JSON.stringify({
              defaultMode: selectedMode,
              excludedIds: excludedIds.join(","),
              topics: selectedTopics.join(","),
              pageSize: pageSize,
              bgColor: bgColor,
            }),
          },
          bgColour: bgColor || undefined,
          isChanged: true,
        };

        // If bgColor is empty, remove the property
        if (!bgColor) {
          delete updatedNode.bgColour;
        }

        ctx.modifyNodes([updatedNode]);
      }
    }
  };

  // Effect to update the node when settings change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      updatePaneNode();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [selectedMode, excludedIds, selectedTopics, pageSize, bgColor]);

  // Toggle a page's exclusion status
  const toggleExclude = (id: string) => {
    setExcludedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Toggle a topic's selection status
  const toggleTopicFilter = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  // Handle pagination
  const handlePageChange = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === "next" && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Exclude all pages with a specific topic
  const excludeAllWithTopic = (topicName: string) => {
    // Get all page IDs with this topic
    const pageIdsToExclude = validPages
      .filter((page) => page.topics && page.topics.includes(topicName))
      .map((page) => page.id);

    // Add them to excluded IDs
    setExcludedIds((prev) => {
      const newExcluded = Array.from(new Set([...prev, ...pageIdsToExclude]));
      return newExcluded;
    });

    // Also remove the topic from selected topics to maintain consistency
    setSelectedTopics((prev) => prev.filter((t) => t !== topicName));
  };

  // Add all pages with a topic and remove from excluded
  const includeAllWithTopic = (topicName: string) => {
    const topicInfo = topicMap.get(topicName);
    if (!topicInfo) return;

    // Remove these pages from excluded IDs
    setExcludedIds((prev) => prev.filter((id) => !topicInfo.pageIds.includes(id)));

    // Ensure the topic is selected
    if (!selectedTopics.includes(topicName)) {
      setSelectedTopics((prev) => [...prev, topicName]);
    }
  };

  // Update page size
  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Check if a topic is effectively selected (in selectedTopics and no pages with this topic are excluded)
  const isTopicEffectivelySelected = (topicName: string) => {
    const topicInfo = topicMap.get(topicName);
    if (!topicInfo) return false;

    return (
      selectedTopics.includes(topicName) &&
      !topicInfo.pageIds.some((id) => excludedIds.includes(id))
    );
  };

  // Check if topic is partially excluded (some pages with this topic are excluded)
  const isTopicPartiallyExcluded = (topicName: string) => {
    const topicInfo = topicMap.get(topicName);
    if (!topicInfo) return false;

    const excludedCount = topicInfo.pageIds.filter((id) => excludedIds.includes(id)).length;
    return excludedCount > 0 && excludedCount < topicInfo.pageIds.length;
  };

  // Check if all pages with this topic are excluded
  const isTopicFullyExcluded = (topicName: string) => {
    const topicInfo = topicMap.get(topicName);
    if (!topicInfo) return false;

    return topicInfo.pageIds.every((id) => excludedIds.includes(id));
  };

  return (
    <div className="w-full p-6 space-y-6 bg-slate-50">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-bold text-gray-900">Content Settings</h3>
        </div>
        <div className="pt-4 space-y-4">
          <div>
            <label htmlFor="page-size" className="block text-sm font-bold text-gray-700">
              Items per page
            </label>
            <select
              id="page-size"
              name="page-size"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-myblue focus:outline-none focus:ring-myblue sm:text-sm"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
            >
              <option value="5">5 items</option>
              <option value="10">10 items</option>
              <option value="15">15 items</option>
              <option value="20">20 items</option>
            </select>
          </div>

          <div>
            <label htmlFor="sort-mode" className="block text-sm font-bold text-gray-700">
              Default sort order
            </label>
            <select
              id="sort-mode"
              name="sort-mode"
              className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-myblue focus:outline-none focus:ring-myblue sm:text-sm"
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Note: Users can toggle between views regardless of the default setting
            </p>
          </div>

          <div>
            <ColorPickerCombo
              title="Background Color"
              defaultColor={bgColor}
              onColorChange={(color: string) => setBgColor(color)}
              config={config!}
              allowNull={true}
            />
            <p className="mt-1 text-xs text-gray-500">
              Set a background color for the content list section
            </p>
          </div>
        </div>
      </div>

      {topics.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 border-b border-gray-200">
            <h3 className="text-lg font-bold leading-6 text-gray-900">Topics</h3>
            <p className="mt-1 text-sm text-gray-500">Select topics to filter content</p>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => {
                  // Only select topics that have valid pages
                  const validTopics = topics
                    .filter((t) =>
                      t.pageIds.some((id) => validPages.some((page) => page.id === id))
                    )
                    .map((t) => t.name);

                  setSelectedTopics(validTopics);
                  // Clear exclusions for all topics
                  const allTopicPageIds = topics.flatMap((t) => t.pageIds);
                  setExcludedIds((prev) => prev.filter((id) => !allTopicPageIds.includes(id)));
                }}
                className="px-3 py-1 text-sm font-bold text-myblue bg-myblue/10 hover:bg-myblue/20 rounded-md"
              >
                Include All Topics
              </button>
              <button
                onClick={() => setSelectedTopics([])}
                className="px-3 py-1 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Clear All
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {topics.map((topic) => (
              <div key={topic.name} className="flex items-center justify-between p-4">
                <div className="flex items-center">
                  <span className="text-sm font-bold text-gray-900">{topic.name}</span>
                  <span className="ml-2 text-sm text-gray-500">({topic.count} pages)</span>
                  {isTopicEffectivelySelected(topic.name) && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-myblue/10 text-myblue">
                      Included
                    </span>
                  )}
                  {isTopicPartiallyExcluded(topic.name) && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                      Partially Excluded
                    </span>
                  )}
                  {isTopicFullyExcluded(topic.name) && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                      Excluded
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => includeAllWithTopic(topic.name)}
                    className={`px-2 py-1 text-xs font-bold ${
                      isTopicEffectivelySelected(topic.name)
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "text-myblue hover:text-myblue-dark bg-myblue/10 hover:bg-myblue/20"
                    } rounded-md`}
                    disabled={isTopicEffectivelySelected(topic.name)}
                  >
                    Include All
                  </button>
                  <button
                    onClick={() => excludeAllWithTopic(topic.name)}
                    className={`px-2 py-1 text-xs font-bold ${
                      isTopicFullyExcluded(topic.name)
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200"
                    } rounded-md`}
                    disabled={isTopicFullyExcluded(topic.name)}
                  >
                    Exclude All
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200">
          <h3 className="text-lg font-bold leading-6 text-gray-900">Matching Pages</h3>
          <p className="mt-1 text-sm text-gray-500">
            Pages matching selected topics ({paginatedPages.length} of {filteredPages.length})
          </p>
        </div>
        {paginatedPages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No pages match the selected criteria. Try selecting different topics or removing
            exclusions.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {paginatedPages.map((page) => {
              const isExcluded = excludedIds.includes(page.id);
              const analytics = $analytics.byId[page.id];

              return (
                <div key={page.id} className="flex items-center p-4">
                  <div className="relative h-16 w-24 flex-shrink-0">
                    <img
                      src={page.thumbSrc}
                      srcSet={page.thumbSrcSet}
                      alt={page.title}
                      className="absolute inset-0 h-full w-full object-cover rounded"
                    />
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-bold text-gray-900">{page.title}</p>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => toggleExclude(page.id)}
                          className={`px-2 py-1 text-xs font-bold rounded ${
                            isExcluded
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              : "bg-red-100 text-red-600 hover:bg-red-200"
                          }`}
                        >
                          {isExcluded ? "Restore" : "Exclude"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-1">
                      <p className="text-sm text-gray-500 line-clamp-1">{page.description}</p>
                    </div>
                    {page.topics && page.topics.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {page.topics.map((topic) => (
                          <span
                            key={topic}
                            onClick={() => toggleTopicFilter(topic)}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold cursor-pointer ${
                              selectedTopics.includes(topic)
                                ? "bg-myblue/10 text-myblue"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 flex items-center text-xs text-gray-500">
                      {analytics && (
                        <>
                          <span>{analytics.total_actions} views</span>
                          {page.changed && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Updated {new Date(page.changed).toLocaleDateString()}</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-between px-4 py-3">
            <button
              onClick={() => handlePageChange("prev")}
              disabled={currentPage === 1}
              className={classNames(
                "px-4 py-2 text-sm font-bold rounded-md",
                currentPage === 1
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-myblue text-white hover:bg-myblue-dark"
              )}
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange("next")}
              disabled={currentPage === totalPages}
              className={classNames(
                "px-4 py-2 text-sm font-bold rounded-md",
                currentPage === totalPages
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-myblue text-white hover:bg-myblue-dark"
              )}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListContentSetup;
