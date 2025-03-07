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

  const featuredPage = $contentMap.find((item) => item.id === selectedFeaturedId) as
    | StoryFragmentContentMap
    | undefined;

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

    // Allow dropping on featured area for any valid page
    if (isFeaturedDrop) {
      e.preventDefault();
      setDragState((prev) => ({ ...prev, dropTarget: id }));
      return;
    }

    // For non-featured areas, only allow dropping if in ordered mode and target is in selected IDs
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
      // First ensure the page is included, then make it featured
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
      // If already featured, just unfeatured it
      setSelectedFeaturedId("");
    } else {
      // If not already featured, make sure it's included first
      if (!selectedIds.includes(id)) {
        setSelectedIds((prev) => [...prev, id]);
      }
      // Then set it as featured
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

  const handleTopicExcludeAll = (pageIds: string[]) => {
    const newSelectedIds = selectedIds.filter((id) => !pageIds.includes(id));
    setSelectedIds(newSelectedIds);
    if (pageIds.includes(selectedFeaturedId)) {
      setSelectedFeaturedId("");
    }
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
        {featuredPage ? (
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
          <div className="p-4 text-center text-sm text-gray-500">
            No featured page selected. Drag a page here to feature it.
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
                  <span className="ml-2 text-sm text-gray-500">({topic.count} pages)</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTopicIncludeAll(topic.pageIds)}
                    className="px-2 py-1 text-xs font-bold text-blue-600 bg-blue-100 hover:bg-blue-200 rounded"
                  >
                    Include All
                  </button>
                  <button
                    onClick={() => handleTopicExcludeAll(topic.pageIds)}
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
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Available Pages</h3>
          <p className="mt-1 text-sm text-gray-500">
            Pages ({paginatedPages.length} of {validPages.length})
          </p>
        </div>
        <div className="divide-y divide-gray-200">
          {paginatedPages.map((page) => {
            const isIncluded = selectedIds.includes(page.id);
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
                            disabled={selectedIds.indexOf(page.id) === 0}
                            className={classNames(
                              "p-1",
                              selectedIds.indexOf(page.id) === 0
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-gray-500 hover:text-blue-600"
                            )}
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveItem(page.id, "down")}
                            disabled={selectedIds.indexOf(page.id) === selectedIds.length - 1}
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
