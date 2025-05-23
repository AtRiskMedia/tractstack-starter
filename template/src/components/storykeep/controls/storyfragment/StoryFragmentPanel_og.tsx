import { useState, useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import { contentMap } from "@/store/events";
import {
  storyFragmentTopicsStore,
  isDemoModeStore,
  setPendingImageOperation,
  getPendingImageOperation,
} from "@/store/storykeep";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import TagIcon from "@heroicons/react/24/outline/TagIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import ArrowUpTrayIcon from "@heroicons/react/24/outline/ArrowUpTrayIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import { getCtx } from "@/store/nodes";
import { cloneDeep, findUniqueSlug, titleToSlug } from "@/utils/common/helpers";
import { isStoryFragmentNode } from "@/utils/nodes/type-guards";
import OgImagePreview from "../fields/OgImagePreview";
import { StoryFragmentMode } from "@/types.ts";
import type {
  FullContentMap,
  StoryFragmentContentMap,
  StoryFragmentNode,
  Config,
  Topic,
  TopicContentMap,
  PaneContentMap,
} from "@/types";
import type { ChangeEvent, MouseEventHandler } from "react";

const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 630;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

interface StoryFragmentOpenGraphPanelProps {
  nodeId: string;
  setMode: (mode: StoryFragmentMode) => void;
  config?: Config;
}

const hasSlug = (item: FullContentMap): item is StoryFragmentContentMap | PaneContentMap =>
  "slug" in item &&
  typeof item.slug === "string" &&
  (item.type === "StoryFragment" || item.type === "Pane");

const StoryFragmentOpenGraphPanel = ({
  nodeId,
  setMode,
  config,
}: StoryFragmentOpenGraphPanelProps) => {
  const isDemoMode = useStore(isDemoModeStore);
  const $contentMap = useStore(contentMap) as FullContentMap[];
  const $storyFragmentTopics = useStore(storyFragmentTopicsStore);
  const storedData = $storyFragmentTopics[nodeId];

  // Local state for draft changes
  const [draftTitle, setDraftTitle] = useState("");
  const [draftTopics, setDraftTopics] = useState<Topic[]>([]);
  const [draftDetails, setDraftDetails] = useState("");
  const [draftImagePath, setDraftImagePath] = useState<string | null>(null);
  const [draftImageData, setDraftImageData] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [warning, setWarning] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [existingTopics, setExistingTopics] = useState<Topic[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataFetched, setDataFetched] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track initial state for change detection
  const initialState = useRef<{
    title: string;
    details: string;
    topics: Topic[];
    socialImagePath: string | null;
    textColor: string;
    bgColor: string;
  } | null>(null);

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const thisNode = allNodes.get(nodeId);

  if (!thisNode || !isStoryFragmentNode(thisNode)) {
    return null;
  }
  const storyfragmentNode = thisNode as StoryFragmentNode;

  const initialized = useRef(false);

  // Initialize draft state and colors
  useEffect(() => {
    const ogParams = ctx.getOgImageParams(nodeId);
    setDraftTitle(storyfragmentNode.title);
    setCharCount(storyfragmentNode.title.length);
    setDraftImagePath(storyfragmentNode.socialImagePath || null);

    initialState.current = {
      title: storyfragmentNode.title,
      details: "",
      topics: [],
      socialImagePath: storyfragmentNode.socialImagePath ?? null,
      textColor: ogParams.textColor,
      bgColor: ogParams.bgColor,
    };

    const pendingOp = getPendingImageOperation(nodeId);
    if (pendingOp) {
      if (pendingOp.type === "upload" && pendingOp.data) {
        setDraftImageData(pendingOp.data);
        setDraftImagePath(pendingOp.path || null);
      } else if (pendingOp.type === "remove") {
        setDraftImagePath(null);
        setDraftImageData(null);
      }
    }
  }, [storyfragmentNode.title, storyfragmentNode.socialImagePath, nodeId]);

  // Handle color changes from OgImagePreview
  const handleColorChange = (newTextColor: string, newBgColor: string) => {
    if (!initialState.current) return;

    if (
      (newTextColor !== initialState.current.textColor ||
        newBgColor !== initialState.current.bgColor) &&
      draftImagePath?.includes("--")
    ) {
      setPendingImageOperation(nodeId, {
        type: "remove",
        path: draftImagePath,
      });
      setDraftImagePath(null);
      setDraftImageData(null);
    }
  };

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    if (newTitle.length <= 70) {
      setDraftTitle(newTitle);
      setCharCount(newTitle.length);
      setIsValid(newTitle.length >= 35 && newTitle.length <= 60);
      setWarning(newTitle.length > 60 && newTitle.length <= 70);

      if (draftImagePath?.includes("--") && newTitle !== initialState.current?.title) {
        setPendingImageOperation(nodeId, {
          type: "remove",
          path: draftImagePath,
        });
        setDraftImagePath(null);
        setDraftImageData(null);
      }
    }
  };

  const validateImage = (file: File): Promise<{ isValid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        resolve({
          isValid: false,
          error: "Please upload only JPG or PNG files",
        });
        return;
      }

      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        if (img.width !== TARGET_WIDTH || img.height !== TARGET_HEIGHT) {
          resolve({
            isValid: false,
            error: `Image must be exactly ${TARGET_WIDTH}x${TARGET_HEIGHT} pixels. Uploaded image is ${img.width}x${img.height} pixels.`,
          });
        } else {
          resolve({ isValid: true });
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve({
          isValid: false,
          error: "Failed to load image for validation",
        });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  useEffect(() => {
    if (initialized.current || dataFetched) return;

    setLoading(true);
    try {
      const topicsContent = $contentMap.find(
        (item) => item.type === "Topic" && item.id === "all-topics"
      ) as TopicContentMap | undefined;

      setExistingTopics(topicsContent?.topics || []);

      let initialTopics: Topic[] = [];
      let initialDescription = "";

      if (storedData) {
        initialTopics = Array.isArray(storedData.topics)
          ? storedData.topics.map((t) => ({
              id: typeof t.id === "string" ? parseInt(t.id, 10) : (t.id ?? -1),
              title: t.title,
            }))
          : [];
        initialDescription = storedData.description || "";
        setDraftTopics(initialTopics);
        setDraftDetails(initialDescription);
      } else {
        const sfContent = $contentMap.find(
          (item): item is StoryFragmentContentMap =>
            item.type === "StoryFragment" && item.id === nodeId
        );

        if (sfContent && sfContent.topics && sfContent.topics.length > 0) {
          initialTopics = sfContent.topics.map((topicTitle) => {
            const existingTopic = topicsContent?.topics.find(
              (t) => t.title.toLowerCase() === topicTitle.toLowerCase()
            );
            return existingTopic || { id: -1, title: topicTitle };
          });
          initialDescription = sfContent.description || "";
          setDraftTopics(initialTopics);
          setDraftDetails(initialDescription);
        } else {
          setDraftTopics([]);
          setDraftDetails("");
        }
      }

      if (initialState.current) {
        initialState.current.details = initialDescription;
        initialState.current.topics = cloneDeep(initialTopics);
      }

      setDataFetched(true);
      initialized.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [nodeId, storedData, $contentMap, dataFetched]);

  // Detect changes
  useEffect(() => {
    if (!loading && dataFetched && initialState.current) {
      const initial = initialState.current;
      const pendingOp = getPendingImageOperation(nodeId);

      const topicsChanged =
        draftTopics.length !== initial.topics.length ||
        draftTopics.some(
          (t, i) =>
            t.title.toLowerCase() !== initial.topics[i]?.title.toLowerCase() ||
            t.id !== initial.topics[i]?.id
        );

      const imageChanged = pendingOp !== null || draftImagePath !== initial.socialImagePath;

      const hasChangesDetected =
        draftTitle !== initial.title ||
        draftDetails !== initial.details ||
        topicsChanged ||
        imageChanged;

      setHasChanges(hasChangesDetected);
    }
  }, [draftTopics, draftDetails, draftTitle, draftImagePath, nodeId, loading, dataFetched]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setPendingImageOperation(nodeId, {
      type: "remove",
      path: draftImagePath || undefined,
    });
    setDraftImagePath(null);
    setDraftImageData(null);
    setImageError(null);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImageError(null);

    try {
      const validation = await validateImage(file);
      if (!validation.isValid) {
        setImageError(validation.error || "Invalid image");
        setIsProcessing(false);
        return;
      }

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${nodeId}-${Date.now()}.${fileExtension}`; // Custom upload with -

      setPendingImageOperation(nodeId, {
        type: "upload",
        data: base64,
        path: `/images/og/${filename}`,
        filename,
      });

      setDraftImageData(base64);
      setDraftImagePath(`/images/og/${filename}`);
    } catch (err) {
      setImageError("Failed to process image");
      console.error("Error processing image:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const addTopic = (titleToAdd: string, sourceTopic?: Topic) => {
    if (!titleToAdd) return;

    const titleLower = titleToAdd.toLowerCase().trim();

    if (draftTopics.some((topic) => topic.title.toLowerCase() === titleLower)) return;

    const existingTopicsArray = Array.isArray(existingTopics) ? existingTopics : [];
    const matchingTopic =
      sourceTopic || existingTopicsArray.find((topic) => topic.title.toLowerCase() === titleLower);

    if (matchingTopic) {
      setDraftTopics([...draftTopics, { id: matchingTopic.id, title: matchingTopic.title }]);
    } else {
      setDraftTopics([...draftTopics, { id: -1, title: titleToAdd.trim() }]);
      setExistingTopics([...existingTopicsArray, { id: -1, title: titleToAdd.trim() }]);
    }
  };

  const handleAddTopic: MouseEventHandler<HTMLButtonElement> = () => {
    const titleToAdd = newTopicTitle.trim();
    addTopic(titleToAdd);
    setNewTopicTitle("");
  };

  const handleRemoveTopic = (topicToRemove: Topic) => {
    setDraftTopics((prevTopics) =>
      prevTopics.filter((topic) => topic.title.toLowerCase() !== topicToRemove.title.toLowerCase())
    );
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDraftDetails(e.target.value);
  };

  const handleApplyChanges = () => {
    if (draftTitle !== storyfragmentNode.title) {
      const existingSlugs = $contentMap.filter(hasSlug).map((item) => item.slug);
      const newSlug =
        storyfragmentNode.slug === ""
          ? findUniqueSlug(titleToSlug(draftTitle), existingSlugs)
          : null;

      const updatedNode = cloneDeep({
        ...storyfragmentNode,
        title: draftTitle,
        ...(newSlug ? { slug: newSlug } : {}),
        isChanged: true,
      });
      ctx.modifyNodes([updatedNode]);
    }

    const topicsArray = Array.isArray(draftTopics) ? draftTopics : [];
    const storeTopics = topicsArray.map((topic) => ({
      id: topic.id !== undefined && topic.id !== -1 ? String(topic.id) : undefined,
      title: topic.title,
    }));

    storyFragmentTopicsStore.setKey(nodeId, {
      topics: storeTopics,
      description: draftDetails,
    });

    if (draftTitle === storyfragmentNode.title) {
      const updatedNode = cloneDeep({
        ...storyfragmentNode,
        isChanged: true,
      });
      ctx.modifyNodes([updatedNode]);
    }

    setMode(StoryFragmentMode.DEFAULT);
  };

  return (
    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4">
      <div className="px-3.5">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Page SEO</h3>
          <button
            onClick={() => setMode(StoryFragmentMode.DEFAULT)}
            className="text-blue-600 hover:text-black"
          >
            ← Close Panel
          </button>
        </div>

        {hasChanges && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleApplyChanges}
              className="bg-cyan-600 text-white px-4 py-2 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              Apply Changes
            </button>
          </div>
        )}

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

        <div className="space-y-6">
          <div>
            <h3 className="block text-sm font-bold text-gray-700 mb-1">Page Title</h3>
            <div className="relative">
              <input
                type="text"
                value={draftTitle}
                onChange={handleTitleChange}
                className={`w-full px-2 py-1 pr-16 rounded-md border ${
                  charCount < 10
                    ? "border-red-500 bg-red-50"
                    : isValid
                      ? "border-green-500 bg-green-50"
                      : warning
                        ? "border-yellow-500 bg-yellow-50"
                        : "border-gray-300"
                }`}
                placeholder="Enter story fragment title (50-60 characters recommended)"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {charCount < 10 ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                ) : isValid ? (
                  <CheckIcon className="h-5 w-5 text-green-500" />
                ) : warning ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                ) : null}
                <span
                  className={`text-sm ${
                    charCount < 10
                      ? "text-red-500"
                      : isValid
                        ? "text-green-500"
                        : warning
                          ? "text-yellow-500"
                          : "text-gray-500"
                  }`}
                >
                  {charCount}/70
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-2 mt-2">
              <p>Write a clear, descriptive title that accurately represents your page content.</p>
              <ul className="ml-4 space-y-1">
                <li>
                  <CheckIcon className="h-4 w-4 inline mr-1" /> Include relevant keywords
                </li>
                <li>
                  <CheckIcon className="h-4 w-4 inline mr-1" /> Avoid unnecessary words like
                  "welcome to" or "the"
                </li>
                <li>
                  <CheckIcon className="h-4 w-4 inline mr-1" /> Unique titles across your website
                </li>
              </ul>
              <div className="py-2">
                {charCount < 10 && (
                  <span className="text-red-500">Title must be at least 10 characters</span>
                )}
                {charCount >= 10 && charCount < 35 && (
                  <span className="text-gray-500">
                    Add {35 - charCount} more characters for optimal length
                  </span>
                )}
                {warning && <span className="text-yellow-500">Title is getting long</span>}
                {isValid && <span className="text-green-500">Perfect title length!</span>}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-1">
              Page Description
            </label>
            <textarea
              id="description"
              rows={3}
              className={`w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-blue-600 focus:ring-blue-600 ${
                isDemoMode ? "opacity-75 cursor-not-allowed" : ""
              }`}
              placeholder="Add a description for this page..."
              value={draftDetails}
              onChange={handleDescriptionChange}
              disabled={isDemoMode}
              title={isDemoMode ? "Description editing is disabled in demo mode" : ""}
            />
            <p className="mt-1 text-sm text-gray-500">
              This description helps with SEO and may appear in search results.
            </p>
          </div>

          <div>
            <h3 className="block text-sm font-bold text-gray-700 mb-2">Social Share Image</h3>

            {draftImageData || draftImagePath ? (
              <div className="flex items-start space-x-4">
                <div
                  className="relative w-64 bg-gray-100 rounded-md overflow-hidden"
                  style={{ aspectRatio: 1.91 / 1 }}
                >
                  <img
                    src={draftImageData || `${draftImagePath}?v=${Date.now()}`}
                    alt="Open Graph preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={handleRemoveImage}
                    disabled={isProcessing || isDemoMode}
                    title={isDemoMode ? "Image removal is disabled in demo mode" : "Remove image"}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-200 disabled:opacity-50"
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-800" />
                  </button>
                </div>

                <div className="flex-grow">
                  <button
                    onClick={handleUploadClick}
                    disabled={isProcessing || isDemoMode}
                    title={isDemoMode ? "Image uploads are disabled in demo mode" : "Replace image"}
                    className="flex items-center text-sm text-blue-600 hover:text-orange-600 disabled:opacity-50"
                  >
                    <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
                    {isProcessing ? "Processing..." : "Replace Image"}
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png"
                    className="hidden"
                  />

                  <p className="mt-2 text-xs text-gray-800 break-all">
                    {draftImageData ? "New image (pending save)" : draftImagePath}
                  </p>
                  {imageError && <p className="mt-2 text-sm text-red-600">{imageError}</p>}
                </div>
              </div>
            ) : (
              <>
                {config && (
                  <OgImagePreview
                    nodeId={nodeId}
                    title={draftTitle}
                    socialImagePath={draftImagePath}
                    config={config}
                    onColorChange={handleColorChange}
                  />
                )}
                <div className="flex space-x-4 mt-4">
                  <div
                    className="relative w-64 bg-gray-100 rounded-md overflow-hidden"
                    style={{ aspectRatio: 1.91 / 1 }}
                  >
                    <div className="flex items-center justify-center w-full h-full border-2 border-dashed border-gray-400 rounded-md">
                      <span className="text-sm text-gray-600">No image selected</span>
                    </div>
                  </div>

                  <div className="flex-grow">
                    <button
                      onClick={handleUploadClick}
                      disabled={isProcessing || isDemoMode}
                      title={
                        isDemoMode ? "Image uploads are disabled in demo mode" : "Upload image"
                      }
                      className="flex items-center text-sm text-blue-600 hover:text-orange-600 disabled:opacity-50"
                    >
                      <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
                      {isProcessing ? "Processing..." : "Upload Image"}
                    </button>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png"
                      className="hidden"
                    />

                    {imageError && <p className="mt-2 text-sm text-red-600">{imageError}</p>}
                  </div>
                </div>

                <div className="text-sm text-gray-600 space-y-2 mt-2">
                  <p>This image will be used when your page is shared on social media.</p>
                  <p>Requirements:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>
                      Image must be exactly {TARGET_WIDTH}x{TARGET_HEIGHT} pixels
                    </li>
                    <li>Only JPG or PNG formats are accepted</li>
                    <li>Keep important content centered</li>
                    <li>Use clear, high-contrast imagery</li>
                    <li>Avoid small text</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          {!isDemoMode && draftDetails.trim().length > 0 && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Topics</label>

              <div className="flex mb-3">
                <input
                  type="text"
                  className="flex-grow rounded-l-md border border-gray-300 shadow-sm p-2 focus:border-blue-600 focus:ring-blue-600"
                  placeholder="Add a new tag..."
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTopic(newTopicTitle.trim());
                      setNewTopicTitle("");
                    }
                  }}
                />
                <button
                  onClick={handleAddTopic}
                  disabled={!newTopicTitle.trim()}
                  className="bg-blue-600 text-white rounded-r-md px-3 py-2 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {draftTopics.map((topic) => (
                  <div
                    key={`topic-${topic.title}`}
                    className="flex items-center bg-gray-100 rounded-full px-3 py-1"
                  >
                    <TagIcon className="h-4 w-4 text-gray-500 mr-1" />
                    <span className="text-sm">{topic.title}</span>
                    <button
                      onClick={() => handleRemoveTopic(topic)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {draftTopics.length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    No topics added yet. Topics help organize and categorize your content.
                  </p>
                )}
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-bold text-gray-700 mb-2">Available Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {existingTopics
                    .filter(
                      (existingTopic) =>
                        !draftTopics.some(
                          (topic) => topic.title.toLowerCase() === existingTopic.title.toLowerCase()
                        )
                    )
                    .map((availableTopic) => (
                      <button
                        key={`available-${availableTopic.title}`}
                        onClick={() => addTopic(availableTopic.title, availableTopic)}
                        className="flex items-center bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full px-3 py-1 transition-colors"
                      >
                        <TagIcon className="h-3 w-3 text-gray-400 mr-1" />
                        <span className="text-xs text-gray-600">{availableTopic.title}</span>
                      </button>
                    ))}
                  {existingTopics.filter(
                    (existingTopic) =>
                      !draftTopics.some(
                        (topic) => topic.title.toLowerCase() === existingTopic.title.toLowerCase()
                      )
                  ).length === 0 && (
                    <p className="text-xs text-gray-500 italic">No additional topics available.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {hasChanges && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleApplyChanges}
              className="bg-cyan-600 text-white px-4 py-2 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              Apply Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryFragmentOpenGraphPanel;
