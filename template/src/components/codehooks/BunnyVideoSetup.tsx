import { useState, useEffect, useRef } from "react";
import { getCtx } from "@/store/nodes";
import { cloneDeep } from "@/utils/common/helpers";
import ColorPickerCombo from "@/components/storykeep/controls/fields/ColorPickerCombo";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import TrashIcon from "@heroicons/react/24/outline/TrashIcon";
import ArrowsUpDownIcon from "@heroicons/react/24/outline/ArrowsUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import ChevronDownIcon from "@heroicons/react/24/outline/ChevronDownIcon";
import ChevronUpIcon from "@heroicons/react/24/outline/ChevronUpIcon";
import ActionBuilderSlugSelector from "@/components/storykeep/controls/fields/ActionBuilderSlugSelector";
import type { PaneNode, Config, VideoMoment, StoryFragmentNode } from "@/types";

interface BunnyVideoSetupProps {
  nodeId: string;
  params?: any;
  config?: Config;
}

interface Chapter extends VideoMoment {
  id: string; // Unique ID for managing chapters in the UI
}

interface PaneListItem {
  id: string;
  title: string;
  slug: string;
  type: "Pane";
  isContext: boolean;
}

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

const BunnyVideoSetup = ({ nodeId, params, config }: BunnyVideoSetupProps) => {
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const storyFragmentId = ctx.getClosestNodeTypeFromId(nodeId, "StoryFragment");
  const storyFragmentNode = allNodes.get(storyFragmentId) as StoryFragmentNode | undefined;
  const paneIds = storyFragmentNode?.paneIds || [];

  const paneList: PaneListItem[] = paneIds
    .map((paneId) => {
      const paneNode = allNodes.get(paneId) as PaneNode | undefined;
      if (paneNode && paneNode.nodeType === "Pane") {
        return {
          id: paneNode.id,
          title: paneNode.title,
          slug: paneNode.slug,
          type: "Pane" as const,
          isContext: paneNode.isContextPane || false,
        };
      }
      return null;
    })
    .filter((item): item is PaneListItem => item !== null);

  const storyFragmentEntry = storyFragmentNode
    ? {
        id: storyFragmentNode.id,
        title: storyFragmentNode.title,
        slug: storyFragmentNode.slug,
        type: "StoryFragment" as const,
        panes: storyFragmentNode.paneIds,
      }
    : null;

  const modifiedContentMap = storyFragmentEntry ? [storyFragmentEntry, ...paneList] : paneList;

  const initializedRef = useRef(false);

  const [showDetails, setShowDetails] = useState(false);
  const [videoUrl, setVideoUrl] = useState(params?.videoUrl || "");
  const [videoTitle, setVideoTitle] = useState(params?.title || "Video");
  const [bgColor, setBgColor] = useState(params?.bgColor || "");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [chapterQueries, setChapterQueries] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!initializedRef.current && params) {
      initializedRef.current = true;
      setVideoUrl(params.videoUrl || "");
      setVideoTitle(params.title || "Video");
      setBgColor(params.bgColor || "");
      if (Array.isArray(params.chapters)) {
        setChapters(
          params.chapters.map((chapter: VideoMoment) => ({
            ...chapter,
            id: generateId(),
          }))
        );
      }
    }
  }, [params]);

  const isValidBunnyUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname === "iframe.mediadelivery.net" &&
        urlObj.pathname.startsWith("/embed/") &&
        url.length > 30
      );
    } catch {
      return false;
    }
  };

  // Update the pane node in the store with optional custom chapters
  const updatePaneNode = (customChapters?: Chapter[]) => {
    if (!nodeId) return;
    const allNodesSnapshot = ctx.allNodes.get();
    const paneNode = cloneDeep(allNodesSnapshot.get(nodeId)) as PaneNode;

    if (paneNode) {
      const chaptersToUse = Array.isArray(customChapters) ? customChapters : chapters || [];
      const chaptersData =
        chaptersToUse.length > 0
          ? chaptersToUse.map(({ id, ...rest }) => rest).sort((a, b) => a.startTime - b.startTime)
          : [];

      const updatedNode = {
        ...paneNode,
        codeHookTarget: "bunny-video",
        codeHookPayload: {
          options: JSON.stringify({
            videoUrl,
            title: videoTitle,
            chapters: chaptersData,
            bgColor,
          }),
        },
        isChanged: true,
      };

      if (bgColor) {
        updatedNode.bgColour = bgColor;
      } else {
        delete updatedNode.bgColour;
      }

      ctx.modifyNodes([updatedNode]);
    }
  };

  const saveChanges = (customChapters?: Chapter[] | React.FocusEvent<HTMLInputElement>) => {
    if (!customChapters || "target" in customChapters) {
      updatePaneNode();
    } else {
      updatePaneNode(customChapters);
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const validateChapter = (chapter: Chapter, index: number): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!chapter.title?.trim()) {
      errors[`title-${index}`] = "Title is required";
    }
    if (
      typeof chapter.startTime !== "number" ||
      isNaN(chapter.startTime) ||
      chapter.startTime < 0
    ) {
      errors[`startTime-${index}`] = "Start time must be a positive number";
    }
    if (typeof chapter.endTime !== "number" || isNaN(chapter.endTime)) {
      errors[`endTime-${index}`] = "End time must be a number";
    } else if (chapter.startTime !== undefined && chapter.endTime <= chapter.startTime) {
      errors[`endTime-${index}`] = "End time must be greater than start time";
    }

    const otherChapters = [...chapters];
    if (index < chapters.length) {
      otherChapters.splice(index, 1);
    }

    if (typeof chapter.startTime === "number" && typeof chapter.endTime === "number") {
      for (let i = 0; i < otherChapters.length; i++) {
        const other = otherChapters[i];
        if (
          (chapter.startTime >= other.startTime && chapter.startTime < other.endTime) ||
          (chapter.endTime > other.startTime && chapter.endTime <= other.endTime) ||
          (chapter.startTime <= other.startTime && chapter.endTime >= other.endTime)
        ) {
          errors[`overlap-${index}`] = "Chapter times overlap with another chapter";
          break;
        }
      }
    }

    return errors;
  };

  const addChapter = () => {
    const newChapter: Chapter = {
      id: generateId(),
      title: "New Chapter",
      startTime: chapters.length > 0 ? chapters[chapters.length - 1].endTime : 0,
      endTime: chapters.length > 0 ? chapters[chapters.length - 1].endTime + 60 : 60,
      description: "",
    };

    const updatedChapters = [...chapters, newChapter];
    setChapters(updatedChapters);
    saveChanges(updatedChapters);
  };

  // Update a chapter
  const updateChapter = (index: number, updates: Partial<Chapter>) => {
    const updatedChapters = [...chapters];
    updatedChapters[index] = { ...updatedChapters[index], ...updates };

    const errors = validateChapter(updatedChapters[index], index);
    setFormErrors((prev) => ({ ...prev, ...errors }));

    setChapters(updatedChapters);
    // We don't automatically save here - that happens on blur
  };

  const removeChapter = (index: number) => {
    const updatedChapters = [...chapters];
    updatedChapters.splice(index, 1);
    setChapters(updatedChapters);

    const newErrors = { ...formErrors };
    Object.keys(newErrors).forEach((key) => {
      if (key.endsWith(`-${index}`)) {
        delete newErrors[key];
      }
    });
    setFormErrors(newErrors);

    saveChanges(updatedChapters);
  };

  const moveChapter = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === chapters.length - 1)
    ) {
      return;
    }

    const updatedChapters = [...chapters];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [updatedChapters[index], updatedChapters[newIndex]] = [
      updatedChapters[newIndex],
      updatedChapters[index],
    ];

    setChapters(updatedChapters);
    saveChanges(updatedChapters);
  };

  const handlePaneSelect = (index: number, slug: string) => {
    const selectedPane = Array.from(allNodes.values()).find(
      (node) => node.nodeType === "Pane" && `slug` in node && node.slug === slug
    ) as PaneNode | undefined;

    const linkedPaneId = selectedPane ? selectedPane.id : undefined;

    const updatedChapters = [...chapters];
    updatedChapters[index] = { ...updatedChapters[index], linkedPaneId };

    const errors = validateChapter(updatedChapters[index], index);
    setFormErrors((prev) => ({ ...prev, ...errors }));
    setChapters(updatedChapters);
    saveChanges(updatedChapters);
  };

  const getLinkedPaneSlug = (linkedPaneId?: string): string => {
    if (!linkedPaneId) return "";
    const paneNode = allNodes.get(linkedPaneId) as PaneNode | undefined;
    return paneNode?.slug || "";
  };

  return (
    <div className="w-full p-6 bg-slate-50">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900">Bunny Video Configuration</h3>
          <button
            type="button"
            onClick={toggleDetails}
            className="px-3 py-1 bg-cyan-600 text-white text-sm font-bold rounded hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 flex items-center"
          >
            {showDetails ? (
              <>
                <ChevronUpIcon className="h-4 w-4 mr-1" />
                Hide Video Details
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-4 w-4 mr-1" />
                Edit Video Details
              </>
            )}
          </button>
        </div>

        {showDetails && (
          <div className="p-4 space-y-6">
            <div>
              <label htmlFor="videoUrl" className="block text-sm font-bold text-gray-700">
                Bunny Stream URL
              </label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  id="videoUrl"
                  className={`px-2.5 py-1.5 block w-full pr-10 rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm ${videoUrl && !isValidBunnyUrl(videoUrl) ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""}`}
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={saveChanges}
                  placeholder="https://iframe.mediadelivery.net/embed/12345/my-video"
                />
                {videoUrl && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    {isValidBunnyUrl(videoUrl) ? (
                      <CheckIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <XMarkIcon className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter the full Bunny Stream embed URL from your Bunny.net dashboard
              </p>
              {videoUrl && !isValidBunnyUrl(videoUrl) && (
                <p className="mt-1 text-xs text-red-500">
                  URL should look like: https://iframe.mediadelivery.net/embed/12345/video-id
                </p>
              )}
            </div>

            <div>
              <label htmlFor="videoTitle" className="block text-sm font-bold text-gray-700">
                Video Title
              </label>
              <input
                type="text"
                id="videoTitle"
                className="px-2.5 py-1.5 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                onBlur={saveChanges}
                placeholder="Video Title"
              />
            </div>

            <div>
              <ColorPickerCombo
                title="Background Color"
                defaultColor={bgColor}
                onColorChange={(color) => {
                  setBgColor(color);
                  setTimeout(() => saveChanges(), 100);
                }}
                config={config!}
                allowNull={true}
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional background color for the video section
              </p>
            </div>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Video Chapters</h3>
            <button
              type="button"
              onClick={addChapter}
              className="px-3 py-1 bg-cyan-600 text-white text-sm font-bold rounded hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Chapter
            </button>
          </div>

          <div className="divide-y divide-gray-200">
            {chapters.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                <p>No chapters added yet. Add a chapter to break your video into sections.</p>
              </div>
            )}

            {chapters.map((chapter, index) => {
              const query = chapterQueries[chapter.id] || "";
              const setQuery = (newQuery: string) => {
                setChapterQueries({ ...chapterQueries, [chapter.id]: newQuery });
              };

              // Get the current slug directly from the chapter's linkedPaneId
              const currentSlug = getLinkedPaneSlug(chapter.linkedPaneId);

              return (
                <div key={chapter.id} className="p-4">
                  <div className="flex justify-between mb-2">
                    <h4 className="text-sm font-bold text-gray-900">Chapter {index + 1}</h4>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => moveChapter(index, "up")}
                        disabled={index === 0}
                        className={`p-1 rounded ${
                          index === 0
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-500 hover:text-cyan-600 hover:bg-gray-100"
                        }`}
                        title="Move up"
                      >
                        <ArrowsUpDownIcon className="h-4 w-4 rotate-180" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveChapter(index, "down")}
                        disabled={index === chapters.length - 1}
                        className={`p-1 rounded ${
                          index === chapters.length - 1
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-500 hover:text-cyan-600 hover:bg-gray-100"
                        }`}
                        title="Move down"
                      >
                        <ArrowsUpDownIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeChapter(index)}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-gray-100 rounded"
                        title="Remove chapter"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700">Title</label>
                      <input
                        type="text"
                        value={chapter.title}
                        onChange={(e) => updateChapter(index, { title: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        onBlur={() => saveChanges()}
                        className={`px-2.5 py-1.5 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm ${
                          formErrors[`title-${index}`] ? "border-red-300" : ""
                        }`}
                      />
                      {formErrors[`title-${index}`] && (
                        <p className="mt-1 text-xs text-red-600">{formErrors[`title-${index}`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700">
                        Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={chapter.description || ""}
                        onChange={(e) => updateChapter(index, { description: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        onBlur={() => saveChanges()}
                        className="px-2.5 py-1.5 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700">
                        Start Time (seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={chapter.startTime}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateChapter(index, {
                            startTime: value === "" ? 0 : parseInt(value),
                          });
                        }}
                        onBlur={() => saveChanges()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        className={`px-2.5 py-1.5 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm ${
                          formErrors[`startTime-${index}`] ? "border-red-300" : ""
                        }`}
                        placeholder="0"
                      />
                      {formErrors[`startTime-${index}`] && (
                        <p className="mt-1 text-xs text-red-600">
                          {formErrors[`startTime-${index}`]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700">
                        End Time (seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={chapter.endTime}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateChapter(index, {
                            endTime: value === "" ? 0 : parseInt(value),
                          });
                        }}
                        onBlur={() => saveChanges()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        className={`px-2.5 py-1.5 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm ${
                          formErrors[`endTime-${index}`] ? "border-red-300" : ""
                        }`}
                        placeholder="60"
                      />
                      {formErrors[`endTime-${index}`] && (
                        <p className="mt-1 text-xs text-red-600">
                          {formErrors[`endTime-${index}`]}
                        </p>
                      )}
                    </div>
                  </div>

                  {formErrors[`overlap-${index}`] && (
                    <p className="mt-2 text-sm text-red-600">{formErrors[`overlap-${index}`]}</p>
                  )}

                  <div className="mt-4">
                    <ActionBuilderSlugSelector
                      type="pane"
                      value={currentSlug}
                      onSelect={(slug) => handlePaneSelect(index, slug)}
                      query={query}
                      setQuery={setQuery}
                      label="Linked Pane"
                      placeholder="Select a pane (optional)"
                      contentMap={modifiedContentMap}
                      parentSlug={storyFragmentNode?.slug}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {showDetails && chapters.length > 0 && (
            <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Chapter Links (Plain Text)</h3>
              </div>

              <div className="p-4 font-mono text-sm bg-gray-50">
                {chapters.map((chapter) => {
                  // Get the linked pane's slug if available
                  const paneSlug = chapter.linkedPaneId
                    ? getLinkedPaneSlug(chapter.linkedPaneId)
                    : "";

                  if (!paneSlug) return null;

                  const fragmentLink = `#${paneSlug}`;
                  const timeLink = `?t=${chapter.startTime}s`;

                  return (
                    <div key={chapter.id} className="mb-4">
                      <p className="mb-1">{chapter.title}</p>
                      <p className="mb-1">{fragmentLink}</p>
                      <p>{timeLink}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BunnyVideoSetup;
