import { useState, useRef, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { RadioGroup } from "@headlessui/react";
import { contentMap } from "@/store/events";
import { storyfragmentAnalyticsStore } from "@/store/storykeep";
import { classNames } from "@/utils/common/helpers";
import { getCtx } from "@/store/nodes";
import { cloneDeep } from "@/utils/common/helpers";
import ColorPickerCombo from "@/components/storykeep/controls/fields/ColorPickerCombo";
import type { StoryFragmentContentMap, PaneNode, Config } from "@/types";

const sortModes = [
  { id: "ordered", name: "Preferred Order", description: "Manually arrange pages" },
  { id: "popularity", name: "Popularity", description: "Sort by most viewed" },
  { id: "recent", name: "Most Recent", description: "Sort by recent updates" },
];

const PER_PAGE = 20;

interface FeaturedContentSetupProps {
  params?: Record<string, string>;
  nodeId: string;
  config?: Config;
}

const FeaturedContentSetup = ({ params, nodeId, config }: FeaturedContentSetupProps) => {
  const $contentMap = useStore(contentMap);
  const $analytics = useStore(storyfragmentAnalyticsStore);
  const draggedRef = useRef<string | null>(null);
  const isInitialMount = useRef(true);

  const [selectedMode, setSelectedMode] = useState(params?.defaultMode || "ordered");
  const [selectedFeaturedId, setSelectedFeaturedId] = useState(params?.featuredId || "");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    params?.storyfragmentIds ? params.storyfragmentIds.split(",") : []
  );
  const [dragState, setDragState] = useState<{
    dragging: string | null;
    dropTarget: string | null;
  }>({
    dragging: null,
    dropTarget: null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [bgColor, setBgColor] = useState(params?.bgColor || "");

  const ctx = getCtx();

  // Get all valid story fragments with required fields
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
        return (
          ($analytics.byId[b.id]?.total_actions || 0) - ($analytics.byId[a.id]?.total_actions || 0)
        );
      }
      if (selectedMode === "recent") {
        return new Date(b.changed || 0).getTime() - new Date(a.changed || 0).getTime();
      }
      const aIndex = selectedIds.indexOf(a.id);
      const bIndex = selectedIds.indexOf(b.id);
      return (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex);
    });

  const featuredPage = $contentMap.find(
    (item) => item.id === selectedFeaturedId && item.type === "StoryFragment"
  ) as StoryFragmentContentMap | undefined;

  // Build topic map
  const topicMap = new Map<string, { count: number; pageIds: string[] }>();
  validPages.forEach((page) => {
    if (page.topics?.length) {
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

  const updatePaneNode = () => {
    if (!nodeId) return;
    const allNodes = ctx.allNodes.get();
    const paneNode = cloneDeep(allNodes.get(nodeId)) as PaneNode;
    if (paneNode) {
      const updatedNode = {
        ...paneNode,
        codeHookTarget: "featured-content",
        codeHookPayload: {
          options: JSON.stringify({
            defaultMode: selectedMode,
            featuredId: selectedFeaturedId,
            storyfragmentIds: selectedIds.join(","),
            bgColor,
          }),
        },
        bgColour: bgColor || undefined,
        isChanged: true,
      };
      if (!bgColor) delete updatedNode.bgColour;
      ctx.modifyNodes([updatedNode]);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timeoutId = setTimeout(updatePaneNode, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedMode, selectedFeaturedId, selectedIds, bgColor]);

  const moveItem = (id: string, direction: "up" | "down") => {
    const currentIndex = selectedIds.indexOf(id);
    if (currentIndex === -1) return;
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= selectedIds.length) return;
    const newOrder = [...selectedIds];
    [newOrder[currentIndex], newOrder[newIndex]] = [newOrder[newIndex], newOrder[currentIndex]];
    setSelectedIds(newOrder);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    draggedRef.current = id;
    setDragState({ dragging: id, dropTarget: null });
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    id: string,
    isFeaturedDrop = false
  ) => {
    if (!draggedRef.current || draggedRef.current === id) return;

    if (isFeaturedDrop) {
      e.preventDefault();
      setDragState((prev) => ({ ...prev, dropTarget: id }));
      return;
    }

    if (selectedMode === "ordered" && selectedIds.includes(id)) {
      e.preventDefault();
      setDragState((prev) => ({ ...prev, dropTarget: id }));
    }
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetId: string,
    isFeaturedDrop = false
  ) => {
    e.preventDefault();
    const draggedId = draggedRef.current;
    if (!draggedId) return;
    setDragState({ dragging: null, dropTarget: null });
    draggedRef.current = null;

    if (isFeaturedDrop) {
      if (!selectedIds.includes(draggedId)) {
        setSelectedIds((prev) => [...prev, draggedId]);
      }
      setSelectedFeaturedId(draggedId);
      return;
    }

    if (selectedMode !== "ordered" || draggedId === targetId || !selectedIds.includes(targetId))
      return;
    const fromIndex = selectedIds.indexOf(draggedId);
    const toIndex = selectedIds.indexOf(targetId);
    const newOrder = [...selectedIds];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);
    setSelectedIds(newOrder);
  };

  const toggleInclude = (id: string) => {
    const newSelectedIds = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    setSelectedIds(newSelectedIds);
    if (selectedFeaturedId === id && !newSelectedIds.includes(id)) {
      setSelectedFeaturedId("");
    }
  };

  const toggleFeatured = (id: string) => {
    if (selectedFeaturedId === id) {
      setSelectedFeaturedId("");
    } else {
      if (!selectedIds.includes(id)) {
        setSelectedIds((prev) => [...prev, id]);
      }
      setSelectedFeaturedId(id);
    }
  };

  const handlePageChange = (direction: "prev" | "next") => {
    setCurrentPage((prev) =>
      direction === "prev" && prev > 1
        ? prev - 1
        : direction === "next" && prev < totalPages
          ? prev + 1
          : prev
    );
  };

  const handleTopicIncludeAll = (pageIds: string[]) => {
    const newSelectedIds = Array.from(new Set([...selectedIds, ...pageIds]));
    setSelectedIds(newSelectedIds);
  };

  const handleTopicExcludeAll = (topicName: string) => {
    const idsToExclude = selectedIds.filter((id) => {
      const page = $contentMap.find((p) => p.id === id);
      if (page?.type === "StoryFragment") {
        return (page as StoryFragmentContentMap).topics?.includes(topicName);
      }
      return false;
    });

    const newSelectedIds = selectedIds.filter((id) => !idsToExclude.includes(id));
    setSelectedIds(newSelectedIds);

    if (featuredPage && featuredPage.topics?.includes(topicName)) {
      setSelectedFeaturedId("");
    }
  };

  const getTopicIncludedCount = (pageIds: string[]) => {
    return pageIds.filter((id) => selectedIds.includes(id)).length;
  };

  return (
    <div className="w-full p-6 space-y-6 bg-slate-50">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold text-gray-900 border-b border-gray-200 pb-4">Settings</h3>
        <div className="pt-4 space-y-4">
          <div>
            <RadioGroup value={selectedMode} onChange={setSelectedMode}>
              <RadioGroup.Label className="block text-sm font-bold text-gray-700">
                Sort Mode
              </RadioGroup.Label>
              <div className="mt-2 space-y-2">
                {sortModes.map((mode) => (
                  <RadioGroup.Option
                    key={mode.id}
                    value={mode.id}
                    className={({ checked }) =>
                      classNames(
                        "flex items-center p-2 rounded-md cursor-pointer border",
                        checked ? "bg-blue-50 border-blue-500" : "border-gray-300"
                      )
                    }
                  >
                    {({ checked }) => (
                      <div className="flex-1">
                        <span
                          className={classNames(
                            "text-sm font-bold",
                            checked ? "text-blue-600" : "text-gray-900"
                          )}
                        >
                          {mode.name}
                        </span>
                        <p className="text-xs text-gray-500">{mode.description}</p>
                      </div>
                    )}
                  </RadioGroup.Option>
                ))}
              </div>
            </RadioGroup>
          </div>
          <div>
            <ColorPickerCombo
              title="Background Color"
              defaultColor={bgColor}
              onColorChange={setBgColor}
              config={config!}
              allowNull={true}
            />
            <p className="mt-1 text-xs text-gray-500">Optional background color</p>
          </div>
        </div>
      </div>

      <div
        className={classNames(
          "bg-white rounded-lg shadow overflow-hidden",
          dragState.dropTarget === "featured" ? "bg-blue-50 border-2 border-blue-500" : ""
        )}
        onDragOver={(e) => handleDragOver(e, "featured", true)}
        onDrop={(e) => handleDrop(e, "featured", true)}
      >
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Featured Page</h3>
          <p className="mt-1 text-sm text-gray-500">
            Drag any page here to feature it (it will be automatically included)
          </p>
        </div>
        {featuredPage && featuredPage.id ? (
          <div className="p-4 flex items-center">
            <img
              src={featuredPage.thumbSrc}
              srcSet={featuredPage.thumbSrcSet}
              alt={featuredPage.title}
              className="h-16 w-24 object-cover rounded flex-shrink-0"
            />
            <div className="ml-4 flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-gray-900 truncate">{featuredPage.title}</p>
                <button
                  onClick={() => toggleFeatured(featuredPage.id)}
                  className="px-2 py-1 text-xs font-bold text-red-600 bg-red-100 hover:bg-red-200 rounded"
                >
                  Unfeature
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500 line-clamp-1">{featuredPage.description}</p>
              <div className="mt-1 text-xs text-gray-500">
                {$analytics.byId[featuredPage.id]?.total_actions || 0} views
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center border-2 border-dashed border-gray-300 rounded-md mx-4 my-4">
            <div className="flex flex-col items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-gray-400 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M8 10h.01M12 14h.01M16 18h.01M18 8l-6-6-6 6H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2h-2l-2-2z"
                />
              </svg>
              <h3 className="text-sm font-medium text-gray-700">No Featured Article</h3>
              <p className="mt-1 text-xs text-gray-500">
                Select a featured article from available pages or drag a page here
              </p>
            </div>
          </div>
        )}
      </div>

      {topics.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Topics</h3>
            <p className="mt-1 text-sm text-gray-500">Manage pages by topic</p>
          </div>
          <div className="divide-y divide-gray-200">
            {topics.map((topic) => (
              <div key={topic.name} className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-gray-900">{topic.name}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({topic.count} pages, {getTopicIncludedCount(topic.pageIds)}/{topic.count}{" "}
                    included)
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTopicIncludeAll(topic.pageIds)}
                    className="px-2 py-1 text-xs font-bold text-blue-600 bg-blue-100 hover:bg-blue-200 rounded"
                  >
                    Include All
                  </button>
                  <button
                    onClick={() => handleTopicExcludeAll(topic.name)}
                    className="px-2 py-1 text-xs font-bold text-red-600 bg-red-100 hover:bg-red-200 rounded"
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
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Include additional pages</h3>
            <p className="mt-1 text-sm text-gray-500">
              Pages ({selectedIds.length - (selectedFeaturedId ? 1 : 0)} included /{" "}
              {validPages.length} available)
            </p>
          </div>
          <span className="bg-blue-100 text-blue-800 py-1 px-3 rounded-full text-sm font-medium">
            {selectedIds.length - (selectedFeaturedId ? 1 : 0)} / {validPages.length}
          </span>
        </div>
        <div className="divide-y divide-gray-200">
          {paginatedPages.map((page) => {
            const isIncluded = selectedIds.includes(page.id);
            const isOnly = selectedIds.includes(selectedFeaturedId) && selectedIds.length == 2;
            return (
              <div
                key={page.id}
                draggable
                onDragStart={(e) => handleDragStart(e, page.id)}
                onDragOver={(e) => handleDragOver(e, page.id)}
                onDrop={(e) => handleDrop(e, page.id)}
                className={classNames(
                  "p-4 flex items-center",
                  selectedMode === "ordered" && isIncluded ? "cursor-move" : "",
                  dragState.dragging === page.id ? "opacity-50 bg-gray-100" : "",
                  dragState.dropTarget === page.id ? "bg-blue-50 border-2 border-blue-500" : ""
                )}
              >
                <img
                  src={page.thumbSrc}
                  srcSet={page.thumbSrcSet}
                  alt={page.title}
                  className="h-16 w-24 object-cover rounded flex-shrink-0"
                />
                <div className="ml-4 flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-gray-900 truncate">{page.title}</p>
                    <div className="flex gap-2">
                      {selectedMode === "ordered" && isIncluded && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveItem(page.id, "up")}
                            disabled={isOnly || selectedIds.indexOf(page.id) === 0}
                            className={classNames(
                              "p-1",
                              isOnly || selectedIds.indexOf(page.id) === 0
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-gray-500 hover:text-blue-600"
                            )}
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveItem(page.id, "down")}
                            disabled={
                              isOnly || selectedIds.indexOf(page.id) === selectedIds.length - 1
                            }
                            className={classNames(
                              "p-1",
                              selectedIds.indexOf(page.id) === selectedIds.length - 1
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-gray-500 hover:text-blue-600"
                            )}
                          >
                            ↓
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => toggleFeatured(page.id)}
                        className={classNames(
                          "px-2 py-1 text-xs font-bold rounded",
                          selectedFeaturedId === page.id
                            ? "bg-red-100 text-red-600 hover:bg-red-200"
                            : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                        )}
                      >
                        {selectedFeaturedId === page.id ? "Unfeature" : "Make Featured"}
                      </button>

                      <button
                        onClick={() => toggleInclude(page.id)}
                        className={classNames(
                          "px-2 py-1 text-xs font-bold rounded",
                          isIncluded
                            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            : "bg-green-100 text-green-600 hover:bg-green-200"
                        )}
                      >
                        {isIncluded ? "Exclude" : "Include"}
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-1">{page.description}</p>
                  <div className="mt-1 text-xs text-gray-500">
                    {$analytics.byId[page.id]?.total_actions || 0} views • Updated{" "}
                    {new Date(page.changed || 0).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {totalPages > 1 && (
          <div className="flex justify-between p-4">
            <button
              onClick={() => handlePageChange("prev")}
              disabled={currentPage === 1}
              className={classNames(
                "px-4 py-2 text-sm font-bold rounded",
                currentPage === 1
                  ? "bg-gray-200 text-gray-500"
                  : "bg-blue-600 text-white hover:bg-blue-700"
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
                "px-4 py-2 text-sm font-bold rounded",
                currentPage === totalPages
                  ? "bg-gray-200 text-gray-500"
                  : "bg-blue-600 text-white hover:bg-blue-700"
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
