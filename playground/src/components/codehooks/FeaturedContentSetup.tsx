import { useState, useRef } from "react";
import { useStore } from "@nanostores/react";
import { RadioGroup } from "@headlessui/react";
import ArrowUpIcon from "@heroicons/react/24/outline/ArrowUpIcon";
import ArrowDownIcon from "@heroicons/react/24/outline/ArrowDownIcon";
import { contentMap } from "@/store/events";
import { storyfragmentAnalyticsStore } from "@/store/storykeep";
import { classNames } from "@/utils/common/helpers";
import { getCtx } from "@/store/nodes";
import { cloneDeep } from "@/utils/common/helpers";
import type { StoryFragmentContentMap, PaneNode } from "@/types";

const sortModes = [
  { id: "ordered", name: "Preferred Order", description: "Manually arrange pages in your preferred order" },
  { id: "popularity", name: "Popularity", description: "Sort by most viewed pages" },
  { id: "recent", name: "Most Recent", description: "Sort by recently updated pages" },
];

const dragStyles = {
  dragging: { opacity: 0.5, backgroundColor: "#f9fafb", border: "2px dashed #60a5fa" },
  dropTarget: { backgroundColor: "#eff6ff", border: "2px solid #60a5fa" },
  normal: {},
};

const FEATURED_DROP_ID = "featured-drop-target";
const PER_PAGE = 20;

interface FeaturedContentSetupProps {
  params?: Record<string, string>;
  nodeId: string;
}

const FeaturedContentSetup = ({ params, nodeId }: FeaturedContentSetupProps) => {
  const $contentMap = useStore(contentMap);
  const $analytics = useStore(storyfragmentAnalyticsStore);
  const draggedRef = useRef<string | null>(null);

  const [selectedMode, setSelectedMode] = useState(params?.defaultMode || "ordered");
  const [selectedFeaturedId, setSelectedFeaturedId] = useState(params?.featuredId || "");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    params?.storyfragmentIds ? params.storyfragmentIds.split(",") : []
  );
  const [dragState, setDragState] = useState<{ dragging: string | null; dropTarget: string | null }>({
    dragging: null,
    dropTarget: null,
  });
  const [currentPage, setCurrentPage] = useState(1);

  const ctx = getCtx();

  const validPages = $contentMap
    .filter(
      (item): item is StoryFragmentContentMap =>
        item.type === "StoryFragment" &&
        typeof item.description === "string" &&
        typeof item.thumbSrc === "string" &&
        typeof item.thumbSrcSet === "string" &&
        typeof item.changed === "string" &&
        item.id !== selectedFeaturedId
    )
    .sort((a, b) => {
      if (selectedMode === "popularity") {
        const aViews = $analytics.byId[a.id]?.total_actions || 0;
        const bViews = $analytics.byId[b.id]?.total_actions || 0;
        return bViews - aViews;
      }
      if (selectedMode === "recent") {
        const bDate = b.changed ? new Date(b.changed) : new Date(0);
        const aDate = a.changed ? new Date(a.changed) : new Date(0);
        return bDate.getTime() - aDate.getTime();
      }
      const aIndex = selectedIds.indexOf(a.id);
      const bIndex = selectedIds.indexOf(b.id);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

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
  const topics = Array.from(topicMap.entries()).map(([name, { count, pageIds }]) => ({
    name,
    count,
    pageIds,
  }));

  const totalPages = Math.ceil(validPages.length / PER_PAGE);
  const paginatedPages = validPages.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const featuredPage = selectedFeaturedId
    ? ($contentMap.find((item) => item.id === selectedFeaturedId) as StoryFragmentContentMap | undefined)
    : undefined;

  const getItemStyle = (id: string ) => {
    if (selectedMode !== "ordered") return dragStyles.normal;
    if (dragState.dragging === id) return dragStyles.dragging;
    if (dragState.dropTarget === id || dragState.dropTarget === FEATURED_DROP_ID) return dragStyles.dropTarget;
    return dragStyles.normal;
  };

  const updatePaneNode = (newFeaturedId: string, newSelectedIds: string[]) => {
    if (nodeId) {
      const allNodes = ctx.allNodes.get();
      const paneNode = cloneDeep(allNodes.get(nodeId)) as PaneNode;
      if (paneNode) {
        const updatedNode = {
          ...paneNode,
          codeHookTarget: "featured-content",
          codeHookPayload: {
            options: JSON.stringify({
              defaultMode: selectedMode,
              featuredId: newFeaturedId,
              storyfragmentIds: newSelectedIds.join(","),
            }),
          },
          isChanged: true,
        };
        ctx.modifyNodes([updatedNode]);
      }
    }
  };

  const moveItem = (fromId: string, direction: "up" | "down") => {
    const currentIndex = selectedIds.indexOf(fromId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= selectedIds.length) return;

    const newOrder = [...selectedIds];
    const [moving] = newOrder.splice(currentIndex, 1);
    newOrder.splice(newIndex, 0, moving);
    setSelectedIds(newOrder);
    updatePaneNode(selectedFeaturedId, newOrder);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (selectedMode !== "ordered") return;
    draggedRef.current = id;
    setDragState({ dragging: id, dropTarget: null });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (selectedMode !== "ordered") return;
    const draggedId = draggedRef.current;
    if (!draggedId) return;
    if (id !== FEATURED_DROP_ID && !selectedIds.includes(id)) return;
    if (draggedId === id) return;
    e.preventDefault();
    setDragState((prev) => ({ ...prev, dropTarget: id }));
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = () => {
    setDragState((prev) => ({ ...prev, dropTarget: null }));
  };

  const handleDragEnd = () => {
    draggedRef.current = null;
    setDragState({ dragging: null, dropTarget: null });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    if (selectedMode !== "ordered") return;
    e.preventDefault();
    const draggedId = draggedRef.current;
    if (!draggedId) {
      handleDragEnd();
      return;
    }
    console.log(targetId, draggedId, selectedIds);

    if (targetId === FEATURED_DROP_ID) {
      setSelectedFeaturedId(draggedId);
      const newSelectedIds = selectedIds.includes(draggedId) ? selectedIds : [...selectedIds, draggedId];
      setSelectedIds(newSelectedIds);
      updatePaneNode(draggedId, newSelectedIds);
      handleDragEnd();
      return;
    }

    if (!selectedIds.includes(targetId) || draggedId === targetId) {
      handleDragEnd();
      return;
    }

    const fromIndex = selectedIds.indexOf(draggedId);
    const toIndex = selectedIds.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) {
      handleDragEnd();
      return;
    }

    const newOrder = [...selectedIds];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);
    setSelectedIds(newOrder);
    updatePaneNode(selectedFeaturedId, newOrder);
    handleDragEnd();
  };

  const toggleInclude = (id: string) => {
    let newSelectedIds: string[];
    if (selectedIds.includes(id)) {
      newSelectedIds = selectedIds.filter((i) => i !== id);
      setSelectedIds(newSelectedIds);
      if (selectedFeaturedId === id) {
        setSelectedFeaturedId("");
        updatePaneNode("", newSelectedIds);
      } else {
        updatePaneNode(selectedFeaturedId, newSelectedIds);
      }
    } else {
      newSelectedIds = [...selectedIds, id];
      setSelectedIds(newSelectedIds);
      updatePaneNode(selectedFeaturedId, newSelectedIds);
    }
  };

  const toggleFeatured = (id: string) => {
    if (selectedFeaturedId === id) {
      setSelectedFeaturedId("");
      updatePaneNode("", selectedIds);
    } else {
      setSelectedFeaturedId(id);
      const newSelectedIds = selectedIds.includes(id) ? selectedIds : [...selectedIds, id];
      setSelectedIds(newSelectedIds);
      updatePaneNode(id, newSelectedIds);
    }
  };

  const handlePageChange = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === "next" && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleTopicIncludeAll = (pageIds: string[]) => {
    const newSelectedIds = Array.from(new Set([...selectedIds, ...pageIds]));
    setSelectedIds(newSelectedIds);
    updatePaneNode(selectedFeaturedId, newSelectedIds);
  };

  const handleTopicExcludeAll = (topicName: string, pageIds: string[]) => {
    console.log("Excluding topic:", topicName, "with pageIds:", pageIds, "from selectedIds:", selectedIds);
    const newSelectedIds = selectedIds.filter((id) => !pageIds.includes(id));
    console.log("New selectedIds after exclude:", newSelectedIds);

    // Check if selectedFeaturedId has the topic using full $contentMap
    const featuredPageData = $contentMap.find((page) => page.id === selectedFeaturedId) as StoryFragmentContentMap | undefined;
    const shouldUnfeature = featuredPageData?.topics?.includes(topicName) || false;
    const newFeaturedId = shouldUnfeature ? "" : selectedFeaturedId;

    console.log("Featured page topics:", featuredPageData?.topics, "Should unfeature:", shouldUnfeature, "New featuredId:", newFeaturedId);

    setSelectedIds(newSelectedIds);
    setSelectedFeaturedId(newFeaturedId);
    updatePaneNode(newFeaturedId, newSelectedIds);
  };

  return (
    <div className="w-full p-6 space-y-6 bg-slate-50">
      <div className="bg-white rounded-lg shadow p-4">
        <RadioGroup value={selectedMode} onChange={setSelectedMode}>
          <RadioGroup.Label className="font-bold text-gray-700">Display Mode</RadioGroup.Label>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {sortModes.map((mode) => (
              <RadioGroup.Option
                key={mode.id}
                value={mode.id}
                className={({ active, checked }) =>
                  classNames(
                    "relative flex cursor-pointer rounded-lg border p-4",
                    checked ? "border-myblue bg-myblue/5" : "border-gray-300",
                    active ? "ring-2 ring-myblue ring-offset-2" : ""
                  )
                }
              >
                {({ checked }) => (
                  <div className="flex flex-col">
                    <span className={classNames("block text-sm font-bold", checked ? "text-myblue" : "text-gray-900")}>
                      {mode.name}
                    </span>
                    <span className="mt-1 text-sm text-gray-500">{mode.description}</span>
                  </div>
                )}
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>
      </div>

      {topics.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 border-b border-gray-200">
            <h3 className="text-lg font-bold leading-6 text-gray-900">Topics</h3>
            <p className="mt-1 text-sm text-gray-500">Manage pages by topic</p>
          </div>
          <div className="divide-y divide-gray-200">
            {topics.map((topic) => (
              <div key={topic.name} className="flex items-center justify-between p-4">
                <div>
                  <span className="text-sm font-medium text-gray-900">{topic.name}</span>
                  <span className="ml-2 text-sm text-gray-500">({topic.count} pages)</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleTopicIncludeAll(topic.pageIds)}
                    className="px-2 py-1 text-xs font-medium text-myblue hover:text-myblue-dark rounded-md bg-myblue/10"
                  >
                    Include all
                  </button>
                  <button
                    onClick={() => handleTopicExcludeAll(topic.name, topic.pageIds)}
                    className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 rounded-md bg-red-100"
                  >
                    Exclude all
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="bg-white rounded-lg shadow overflow-hidden border-2 border-dashed border-gray-300"
        onDragOver={(e) => handleDragOver(e, FEATURED_DROP_ID)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, FEATURED_DROP_ID)}
        style={dragState.dropTarget === FEATURED_DROP_ID ? dragStyles.dropTarget : dragStyles.normal}
      >
        <div className="px-4 py-5 border-b border-gray-200">
          <h3 className="text-lg font-bold leading-6 text-gray-900">Featured Page</h3>
          <p className="mt-1 text-sm text-gray-500">The currently featured page</p>
        </div>
        {featuredPage ? (
          <div className="divide-y divide-gray-200">
            <div key={featuredPage.id} className="flex items-center p-4">
              <div className="relative h-16 w-24 flex-shrink-0">
                <img
                  src={featuredPage.thumbSrc}
                  srcSet={featuredPage.thumbSrcSet}
                  alt={featuredPage.title}
                  className="absolute inset-0 h-full w-full object-cover rounded"
                />
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-bold text-gray-900">{featuredPage.title}</p>
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => toggleFeatured(featuredPage.id)}
                        className="h-4 w-4 rounded border-gray-300 text-myblue focus:ring-myblue"
                      />
                      <span className="text-sm text-gray-500">Feature</span>
                    </label>
                    <label className="inline-flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(featuredPage.id)}
                        onChange={() => toggleInclude(featuredPage.id)}
                        className="h-4 w-4 rounded border-gray-300 text-myblue focus:ring-myblue"
                        disabled
                      />
                      <span className="text-sm text-gray-500">Include</span>
                    </label>
                  </div>
                </div>
                <div className="mt-1">
                  <p className="text-sm text-gray-500 line-clamp-1">{featuredPage.description}</p>
                </div>
                {featuredPage.topics && featuredPage.topics.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {featuredPage.topics.map((topic) => (
                      <span key={topic} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-1 flex items-center text-xs text-gray-500">
                  {$analytics.byId[featuredPage.id] && (
                    <span>{$analytics.byId[featuredPage.id].total_actions} views</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 text-sm">Drop a page here to feature it</div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200">
          <h3 className="text-lg font-bold leading-6 text-gray-900">Available Pages</h3>
          <p className="mt-1 text-sm text-gray-500">Select pages to include and choose one as featured</p>
        </div>
        <div className="divide-y divide-gray-200">
          {paginatedPages.map((page) => {
            const isIncluded = selectedIds.includes(page.id);
            const isFeatured = selectedFeaturedId === page.id;
            const itemIndex = selectedIds.indexOf(page.id);
            const analytics = $analytics.byId[page.id];

            return (
              <div
                key={page.id}
                draggable={selectedMode === "ordered"}
                onDragStart={(e) => handleDragStart(e, page.id)}
                onDragOver={(e) => handleDragOver(e, page.id)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, page.id)}
                style={getItemStyle(page.id)}
                className={classNames(
                  "flex items-center p-4",
                  selectedMode === "ordered" && isIncluded ? "cursor-move" : ""
                )}
              >
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
                      {selectedMode === "ordered" && isIncluded && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => moveItem(page.id, "up")}
                            disabled={itemIndex === 0}
                            className={classNames(
                              "p-1 rounded",
                              itemIndex === 0 ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-myblue"
                            )}
                          >
                            <ArrowUpIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => moveItem(page.id, "down")}
                            disabled={itemIndex === selectedIds.length - 1}
                            className={classNames(
                              "p-1 rounded",
                              itemIndex === selectedIds.length - 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:text-myblue"
                            )}
                          >
                            <ArrowDownIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      <label className="inline-flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isFeatured}
                          onChange={() => toggleFeatured(page.id)}
                          className="h-4 w-4 rounded border-gray-300 text-myblue focus:ring-myblue"
                        />
                        <span className="text-sm text-gray-500">Feature</span>
                      </label>
                      <label className="inline-flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isIncluded}
                          onChange={() => toggleInclude(page.id)}
                          className="h-4 w-4 rounded border-gray-300 text-myblue focus:ring-myblue"
                        />
                        <span className="text-sm text-gray-500">Include</span>
                      </label>
                    </div>
                  </div>
                  <div className="mt-1">
                    <p className="text-sm text-gray-500 line-clamp-1">{page.description}</p>
                  </div>
                  {page.topics && page.topics.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {page.topics.map((topic) => (
                        <span key={topic} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-1 flex items-center text-xs text-gray-500">
                    {analytics && (
                      <>
                        <span>{analytics.total_actions} views</span>
                        {selectedMode === "recent" && (
                          <>
                            <span className="mx-2">•</span>
                            <span>
                              Updated {page.changed ? new Date(page.changed).toLocaleDateString() : "Unknown"}
                            </span>
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
        {totalPages > 1 && (
          <div className="flex justify-between px-4 py-3">
            <button
              onClick={() => handlePageChange("prev")}
              disabled={currentPage === 1}
              className={classNames(
                "px-4 py-2 text-sm font-medium rounded-md",
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
                "px-4 py-2 text-sm font-medium rounded-md",
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

export default FeaturedContentSetup;
