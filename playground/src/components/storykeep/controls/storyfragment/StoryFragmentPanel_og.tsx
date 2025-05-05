import { useState, useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import { contentMap } from "@/store/events";
import { storyFragmentTopicsStore, isDemoModeStore } from "@/store/storykeep";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import TagIcon from "@heroicons/react/24/outline/TagIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import ArrowUpTrayIcon from "@heroicons/react/24/outline/ArrowUpTrayIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import { getCtx } from "@/store/nodes.ts";
import { cloneDeep, findUniqueSlug, titleToSlug } from "@/utils/common/helpers.ts";
import { isStoryFragmentNode } from "@/utils/nodes/type-guards.tsx";
import OgImagePreview from "../fields/OgImagePreview";
import type {
  FullContentMap,
  StoryFragmentContentMap,
  StoryFragmentNode,
  Config,
  Topic,
  TopicContentMap,
  PaneContentMap,
} from "@/types.ts";
import { StoryFragmentMode } from "@/types.ts";
import type { MouseEventHandler, ChangeEvent } from "react";

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
  const isDemoMode = isDemoModeStore.get();
  const [title, setTitle] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [warning, setWarning] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [existingTopics, setExistingTopics] = useState<Topic[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [dataFetched, setDataFetched] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialState = useRef<{
    title: string;
    details: string;
    topics: Topic[];
    socialImagePath: string | null;
  } | null>(null);

  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const thisNode = allNodes.get(nodeId);

  if (!thisNode || !isStoryFragmentNode(thisNode)) {
    return null;
  }
  const storyfragmentNode = thisNode as StoryFragmentNode;

  const initialized = useRef(false);

  const $contentMap = useStore(contentMap) as FullContentMap[];
  const $storyFragmentTopics = useStore(storyFragmentTopicsStore);
  const storedData = $storyFragmentTopics[nodeId];

  useEffect(() => {
    setTitle(storyfragmentNode.title);
    setCharCount(storyfragmentNode.title.length);
  }, [storyfragmentNode.title]);

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    if (newTitle.length <= 70) {
      setTitle(newTitle);
      setCharCount(newTitle.length);
      setIsValid(newTitle.length >= 35 && newTitle.length <= 60);
      setWarning(newTitle.length > 60 && newTitle.length <= 70);
    }
  };

  const handleTitleBlur = () => {
    if (title.length >= 10) {
      const existingSlugs = $contentMap.filter(hasSlug).map((item) => item.slug);
      const newSlug =
        storyfragmentNode.slug === `` ? findUniqueSlug(titleToSlug(title), existingSlugs) : null;
      const updatedNode = cloneDeep({
        ...storyfragmentNode,
        title,
        ...(newSlug ? { slug: newSlug } : {}),
        isChanged: true,
      });
      ctx.modifyNodes([updatedNode]);
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
    const loadContentData = () => {
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
          setTopics(initialTopics);
          setDetails(initialDescription);
        } else {
          const sfContent = $contentMap.find(
            (item): item is StoryFragmentContentMap =>
              item.type === "StoryFragment" && item.id === nodeId
          );

          if (sfContent) {
            if (sfContent.topics && sfContent.topics.length > 0) {
              initialTopics = sfContent.topics.map((topicTitle) => {
                const existingTopic = topicsContent?.topics.find(
                  (t) => t.title.toLowerCase() === topicTitle.toLowerCase()
                );
                return existingTopic || { id: -1, title: topicTitle };
              });
            }
            initialDescription = sfContent.description || "";
            setTopics(initialTopics);
            setDetails(initialDescription);
          } else {
            setTopics([]);
            setDetails("");
          }
        }

        // Store initial state for change detection
        initialState.current = {
          title: storyfragmentNode.title,
          details: initialDescription,
          topics: cloneDeep(initialTopics),
          socialImagePath: storyfragmentNode.socialImagePath ?? null,
        };

        setDataFetched(true);
        initialized.current = true;
      } catch (err) {
        console.error("Error in loadContentData:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadContentData();
  }, [nodeId, storedData, storyfragmentNode.socialImagePath, $contentMap]);

  useEffect(() => {
    if (!loading && dataFetched && initialState.current) {
      const topicsArray = Array.isArray(topics) ? topics : [];
      const storeTopics = topicsArray.map((topic) => ({
        id: topic.id !== undefined && topic.id !== -1 ? String(topic.id) : undefined,
        title: topic.title,
      }));

      storyFragmentTopicsStore.setKey(nodeId, {
        topics: storeTopics,
        description: details,
      });

      // Detect changes
      const initial = initialState.current;
      const topicsChanged =
        topics.length !== initial.topics.length ||
        topics.some(
          (t, i) =>
            t.title.toLowerCase() !== initial.topics[i]?.title.toLowerCase() ||
            t.id !== initial.topics[i]?.id
        );
      const hasChangesDetected =
        title !== initial.title ||
        details !== initial.details ||
        topicsChanged ||
        (storyfragmentNode.socialImagePath ?? null) !== initial.socialImagePath;

      setHasChanges(hasChangesDetected);
    }
  }, [topics, details, title, storyfragmentNode.socialImagePath, nodeId, loading, dataFetched]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCustomImageUpload = (path: string) => {
    const updatedNode = cloneDeep({
      ...storyfragmentNode,
      socialImagePath: path,
      isChanged: true,
    });
    ctx.modifyNodes([updatedNode]);
    setImageError(null);
  };

  const handleRemoveImage = async () => {
    if (storyfragmentNode.socialImagePath) {
      setIsProcessing(true);
      const updatedNode = cloneDeep({
        ...storyfragmentNode,
        socialImagePath: null,
        isChanged: true,
      });
      ctx.modifyNodes([updatedNode]);
      setImageError(null);
      setIsProcessing(false);
    }
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

      if (storyfragmentNode.socialImagePath) {
        await fetch("/api/fs/deleteOgImage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: storyfragmentNode.socialImagePath,
          }),
        });
      }

      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${nodeId}.${fileExtension}`;
      const imageDir = "/images/og";

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const response = await fetch("/api/fs/saveOgImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: imageDir,
          filename,
          data: base64,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const { path: savedPath } = await response.json();
      const updatedNode = cloneDeep({
        ...storyfragmentNode,
        socialImagePath: savedPath,
        isChanged: true,
      });
      ctx.modifyNodes([updatedNode]);
    } catch (err) {
      setImageError("Failed to process image");
      console.error("Error uploading image:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const addTopic = (titleToAdd: string, sourceTopic?: Topic) => {
    if (!titleToAdd) return;

    const titleLower = titleToAdd.toLowerCase().trim();

    if (topics.some((topic) => topic.title.toLowerCase() === titleLower)) return;

    const existingTopicsArray = Array.isArray(existingTopics) ? existingTopics : [];
    const matchingTopic =
      sourceTopic || existingTopicsArray.find((topic) => topic.title.toLowerCase() === titleLower);

    if (matchingTopic) {
      setTopics([...topics, { id: matchingTopic.id, title: matchingTopic.title }]);
    } else {
      setTopics([...topics, { id: -1, title: titleToAdd.trim() }]);
      setExistingTopics([...existingTopicsArray, { id: -1, title: titleToAdd.trim() }]);
    }
  };

  const handleAddTopic: MouseEventHandler<HTMLButtonElement> = () => {
    const titleToAdd = newTopicTitle.trim();
    addTopic(titleToAdd);
    setNewTopicTitle("");
  };

  const handleRemoveTopic = (topicToRemove: Topic) => {
    setTopics((prevTopics) =>
      prevTopics.filter((topic) => topic.title.toLowerCase() !== topicToRemove.title.toLowerCase())
    );
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDetails(e.target.value);
  };

  const nodeIsChanged = () => {
    if (storyfragmentNode) {
      const updatedNode = cloneDeep({
        ...storyfragmentNode,
        isChanged: true,
      });
      ctx.modifyNodes([updatedNode]);
    }
  };

  const handleApplyChanges = () => {
    nodeIsChanged();
    setMode(StoryFragmentMode.DEFAULT);
  };

  const hasDescription = details && details.trim().length > 0;

  return (
    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4">
      <div className="px-3.5">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Page SEO</h3>
          <button
            onClick={() => {
              nodeIsChanged();
              setMode(StoryFragmentMode.DEFAULT);
            }}
            className="text-myblue hover:text-black"
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
                value={title}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
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
              className={`w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-myblue focus:ring-myblue ${
                isDemoMode ? "opacity-75 cursor-not-allowed" : ""
              }`}
              placeholder="Add a description for this page..."
              value={details}
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

            {storyfragmentNode.socialImagePath ? (
              <>
                <div className="flex items-start space-x-4">
                  <div
                    className="relative w-64 bg-mylightgrey/5 rounded-md overflow-hidden"
                    style={{
                      aspectRatio: 1.91 / 1,
                    }}
                  >
                    <img
                      src={`${storyfragmentNode.socialImagePath}?v=${Date.now()}`}
                      alt="Open Graph preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={handleRemoveImage}
                      disabled={isProcessing || isDemoMode}
                      title={isDemoMode ? "Image removal is disabled in demo mode" : "Remove image"}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-mylightgrey disabled:opacity-50"
                    >
                      <XMarkIcon className="w-4 h-4 text-mydarkgrey" />
                    </button>
                  </div>

                  <div className="flex-grow">
                    <button
                      onClick={handleUploadClick}
                      disabled={isProcessing || isDemoMode}
                      title={
                        isDemoMode ? "Image uploads are disabled in demo mode" : "Replace image"
                      }
                      className="flex items-center text-sm text-myblue hover:text-myorange disabled:opacity-50"
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

                    <p className="mt-2 text-xs text-mydarkgrey break-all">
                      {storyfragmentNode.socialImagePath}
                    </p>
                    {imageError && <p className="mt-2 text-sm text-red-600">{imageError}</p>}
                  </div>
                </div>
              </>
            ) : config ? (
              <OgImagePreview
                nodeId={nodeId}
                config={config}
                onCustomImageUpload={handleCustomImageUpload}
                isDemoMode={isDemoMode}
              />
            ) : (
              <>
                <span className="block text-sm text-mydarkgrey mb-2">
                  Upload an image (required size: {TARGET_WIDTH}x{TARGET_HEIGHT}px)
                </span>

                <div className="flex space-x-4">
                  <div
                    className="relative w-64 bg-mylightgrey/5 rounded-md overflow-hidden"
                    style={{
                      aspectRatio: 1.91 / 1,
                    }}
                  >
                    <div className="flex items-center justify-center w-full h-full border-2 border-dashed border-mydarkgrey/30 rounded-md">
                      <span className="text-sm text-mydarkgrey">No image selected</span>
                    </div>
                  </div>

                  <div className="flex-grow">
                    <button
                      onClick={handleUploadClick}
                      disabled={isProcessing || isDemoMode}
                      title={
                        isDemoMode ? "Image uploads are disabled in demo mode" : "Upload image"
                      }
                      className="flex items-center text-sm text-myblue hover:text-myorange disabled:opacity-50"
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

                <div className="text-sm text-mydarkgrey space-y-2 mt-2">
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

          {!isDemoMode && hasDescription ? (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Topics</label>

              <div className="flex mb-3">
                <input
                  type="text"
                  className="flex-grow rounded-l-md border border-gray-300 shadow-sm p-2 focus:border-myblue focus:ring-myblue"
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
                  className="bg-myblue text-white rounded-r-md px-3 py-2 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {topics.map((topic) => (
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
                {topics.length === 0 && (
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
                        !topics.some(
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
                      !topics.some(
                        (topic) => topic.title.toLowerCase() === existingTopic.title.toLowerCase()
                      )
                  ).length === 0 && (
                    <p className="text-xs text-gray-500 italic">No additional topics available.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
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
