import { useState, useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PlusIcon from "@heroicons/react/24/outline/PlusIcon";
import TagIcon from "@heroicons/react/24/outline/TagIcon";
import { storyFragmentTopicsStore } from "@/store/storykeep";
import { StoryFragmentMode } from "@/types.ts";
import { getCtx } from "@/store/nodes.ts";
import { cloneDeep } from "@/utils/common/helpers.ts";
import type { StoryFragmentNode } from "@/types.ts";
import type { MouseEventHandler, ChangeEvent } from "react";

interface Topic {
  id?: string | number;
  title: string;
}

interface StoryFragmentTopicsPanelProps {
  nodeId: string;
  setMode: (mode: StoryFragmentMode) => void;
}

const StoryFragmentTopicsPanel = ({ nodeId, setMode }: StoryFragmentTopicsPanelProps) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [existingTopics, setExistingTopics] = useState<Topic[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [dataFetched, setDataFetched] = useState(false);
  const ctx = getCtx();
  const allNodes = ctx.allNodes.get();
  const storyfragmentNode = allNodes.get(nodeId) as StoryFragmentNode;

  // Use a ref to track initialization
  const initialized = useRef(false);

  // Get the topics store data
  const $storyFragmentTopics = useStore(storyFragmentTopicsStore);
  const storedData = $storyFragmentTopics[nodeId];

  useEffect(() => {
    const fetchData = async () => {
      // Prevent multiple fetches
      if (initialized.current || dataFetched) return;

      setLoading(true);
      try {
        const topicsResponse = await fetch("/api/turso/getAllTopics");
        if (topicsResponse.ok) {
          const topicsData = await topicsResponse.json();
          if (topicsData.success && Array.isArray(topicsData.data.data)) {
            setExistingTopics(topicsData.data.data);
          } else {
            setExistingTopics([]);
          }
        } else {
          console.log("Topics API returned non-200 status:", topicsResponse.status);
          setExistingTopics([]);
        }

        // If we have stored data (for new fragments that aren't yet saved), use it
        if (storedData) {
          setTopics(Array.isArray(storedData.topics) ? storedData.topics : []);
          setDetails(storedData.description || "");
        }
        // Otherwise fetch from API for existing fragments
        else {
          try {
            // Fetch topics for this fragment
            const fragmentTopicsResponse = await fetch(
              `/api/turso/getTopicsForStoryFragment?storyFragmentId=${nodeId}`
            );

            if (fragmentTopicsResponse.ok) {
              const fragmentTopicsData = await fragmentTopicsResponse.json();
              if (fragmentTopicsData.success && typeof fragmentTopicsData.data.data === `object`) {
                const topicsData = Array.isArray(fragmentTopicsData.data.data)
                  ? fragmentTopicsData.data.data
                  : [];
                setTopics(topicsData);
              }
            } else {
              console.log(
                "Fragment topics API returned non-200 status:",
                fragmentTopicsResponse.status
              );
              setTopics([]);
            }
          } catch (topicErr) {
            console.error("Error fetching fragment topics:", topicErr);
            setTopics([]);
          }

          try {
            // Fetch fragment details
            const detailsResponse = await fetch(
              `/api/turso/getStoryFragmentDetails?storyFragmentId=${nodeId}`
            );

            if (detailsResponse.ok) {
              const detailsData = await detailsResponse.json();
              if (detailsData.success && typeof detailsData?.data?.data?.description === `string`) {
                setDetails(detailsData.data.data.description);
              } else {
                setDetails("");
              }
            } else {
              console.log("Details API returned non-200 status:", detailsResponse.status);
              setDetails("");
            }
          } catch (detailsErr) {
            console.error("Error fetching fragment details:", detailsErr);
            setDetails("");
          }
        }

        // Mark data as fetched
        setDataFetched(true);
        initialized.current = true;
      } catch (err) {
        console.error("Error in fetchData:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [nodeId, storedData]);

  // Update the store when topics or details change, but only after initial loading
  useEffect(() => {
    if (!loading && dataFetched) {
      // Ensure topics is an array before mapping
      const topicsArray = Array.isArray(topics) ? topics : [];

      // Type conversion to match the storyFragmentTopicsStore expected format
      const storeTopics = topicsArray.map((topic) => ({
        id: topic.id?.toString(),
        title: topic.title,
      }));

      storyFragmentTopicsStore.setKey(nodeId, {
        topics: storeTopics,
        description: details,
      });
    }
  }, [topics, details, nodeId, loading, dataFetched]);

  const addTopic = (titleToAdd: string, sourceTopic?: Topic) => {
    if (!titleToAdd) return;

    const existingTopic = topics.find(
      (topic) => topic.title.toLowerCase() === titleToAdd.toLowerCase()
    );

    if (existingTopic) return;

    const existingTopicsArray = Array.isArray(existingTopics) ? existingTopics : [];
    const matchingTopic =
      sourceTopic ||
      existingTopicsArray.find((topic) => topic.title?.toLowerCase() === titleToAdd.toLowerCase());

    if (matchingTopic) {
      setTopics([...topics, { id: matchingTopic.id, title: matchingTopic.title }]);
    } else {
      const newTopic = { title: titleToAdd };
      setTopics([...topics, newTopic]);
      setExistingTopics([...existingTopicsArray, newTopic]);
    }
  };

  const handleAddTopic: MouseEventHandler<HTMLButtonElement> = () => {
    const titleToAdd = newTopicTitle.trim();
    addTopic(titleToAdd);
    setNewTopicTitle("");
  };

  const handleRemoveTopic = (topicToRemove: Topic) => {
    setTopics((prevTopics) => {
      const newTopics = prevTopics.filter((topic) => {
        const idMatch =
          topic.id !== undefined && topicToRemove.id !== undefined
            ? topic.id === topicToRemove.id
            : false;
        const titleMatch = topic.title === topicToRemove.title;
        const isMatch = idMatch || titleMatch; // Match if either ID or title matches
        return !isMatch; // Keep if it doesn’t match
      });
      return newTopics;
    });
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

  return (
    <div className="px-1.5 py-6 bg-white rounded-b-md w-full group mb-4">
      <div className="px-3.5">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">SEO ready</h3>
          <button
            onClick={() => {
              nodeIsChanged();
              setMode(StoryFragmentMode.DEFAULT);
            }}
            className="text-myblue hover:text-black"
          >
            ← Go Back
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

        <div className="space-y-6">
          <div>
            <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-1">
              Page Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-myblue focus:ring-myblue"
              placeholder="Add a description for this page..."
              value={details}
              onChange={handleDescriptionChange}
            />
            <p className="mt-1 text-sm text-gray-500">
              This description helps with SEO and may appear in search results.
            </p>
          </div>

          {details && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Topics</label>

              <div className="flex mb-3">
                <input
                  type="text"
                  className="flex-grow rounded-l-md border border-gray-300 shadow-sm p-2 focus:border-myblue focus:ring-myblue"
                  placeholder="Add a topic..."
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTopic(newTopicTitle.trim());
                        setNewTopicTitle("");
                      }
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
                {topics.map((topic, index) => (
                  <div
                    key={topic.id ? `topic-${topic.id}` : `topic-${index}`}
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
              {details && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-gray-700 mb-2">More Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {existingTopics
                      .filter(
                        (existingTopic) =>
                          !topics.some(
                            (topic) =>
                              topic.id === existingTopic.id ||
                              topic.title.toLowerCase() === existingTopic.title.toLowerCase()
                          )
                      )
                      .map((availableTopic) => (
                        <button
                          key={`available-${availableTopic.id || availableTopic.title}`}
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
                          (topic) =>
                            topic.id === existingTopic.id ||
                            topic.title.toLowerCase() === existingTopic.title.toLowerCase()
                        )
                    ).length === 0 && (
                      <p className="text-xs text-gray-500 italic">
                        No additional topics available.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryFragmentTopicsPanel;
