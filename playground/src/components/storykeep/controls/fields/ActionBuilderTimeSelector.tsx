import { useState, useEffect, useMemo } from "react";
import { Combobox } from "@ark-ui/react";
import { createListCollection } from "@ark-ui/react/collection";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import { type BunnyPlayer, hasPlayerJS } from "@/types";
import { getCtx } from "@/store/nodes";
import type { ChangeEvent } from "react";

interface ActionBuilderTimeSelectorProps {
  value: string;
  videoId: string;
  onSelect: (value: string, videoId?: string) => void;
  label: string;
  placeholder?: string;
}

interface TimeSelectModalProps {
  videoUrl: string;
  onClose: () => void;
  onSelect: (time: string) => void;
}

function TimeSelectModal({ videoUrl, onClose, onSelect }: TimeSelectModalProps) {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [manualTime, setManualTime] = useState<string>("");
  const [playerInstance, setPlayerInstance] = useState<BunnyPlayer | null>(null);

  useEffect(() => {
    if (!hasPlayerJS(window)) {
      console.error("Player.js is not loaded");
      return;
    }

    // Create player instance
    const player = new window.playerjs.Player("bunny-stream-embed");

    // When player is ready, store the instance and set up event handlers
    player.on("ready", () => {
      setPlayerInstance(player);

      // Event handler for time updates
      player.on("timeupdate", (data: { seconds: number }) => {
        setCurrentTime(Math.floor(data.seconds));
      });
    });

    return () => {
      if (playerInstance) {
        playerInstance.off("timeupdate");
      }
    };
  }, []);

  const handleGetCurrentTime = () => {
    if (playerInstance) {
      playerInstance.getCurrentTime((time: number) => {
        onSelect(Math.floor(time).toString());
        onClose();
      });
    } else {
      // Fallback in case player instance isn't ready
      onSelect(currentTime.toString());
      onClose();
    }
  };

  const handleManualTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow non-negative numbers
    if (/^\d*$/.test(value)) {
      setManualTime(value);
    }
  };

  const handleSeekToTime = () => {
    const timeInSeconds = parseInt(manualTime);
    if (!isNaN(timeInSeconds) && playerInstance) {
      playerInstance.setCurrentTime(timeInSeconds);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-3xl w-full">
        <h3 className="text-lg font-bold mb-4">Select Video Start Time</h3>
        <p className="text-sm text-gray-600 mb-4">
          Use the video player to find your desired start point, then click "Use Current Time"
        </p>

        <iframe
          id="bunny-stream-embed"
          src={videoUrl}
          className="w-full aspect-video mb-4"
          allow="autoplay"
        />

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={manualTime}
              onChange={handleManualTimeChange}
              placeholder="Enter time in seconds"
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-myorange"
            />
            <button
              onClick={handleSeekToTime}
              className="px-4 py-2 bg-myblue text-white rounded hover:bg-blue-600"
            >
              Seek
            </button>
          </div>

          <div className="flex justify-between items-center">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button
              onClick={handleGetCurrentTime}
              className="px-4 py-2 bg-myorange text-white rounded hover:bg-orange-600"
            >
              Use Current Time {currentTime > 0 ? `(${currentTime}s)` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActionBuilderTimeSelector({
  value,
  videoId,
  onSelect,
  label,
  placeholder = "Select a video",
}: ActionBuilderTimeSelectorProps) {
  const [showModal, setShowModal] = useState(false);
  const [availableVideos, setAvailableVideos] = useState<
    { videoId: string; title: string; url: string }[]
  >([]);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const ctx = getCtx();
    const videoInfo = ctx.getAllBunnyVideoInfo();
    setAvailableVideos(videoInfo);

    if (videoId) {
      const matchingVideo = videoInfo.find((v) => v.videoId === videoId);
      if (matchingVideo) {
        setSelectedVideoUrl(matchingVideo.url);
      }
    }
  }, [videoId]);

  // Create collection for Ark UI Combobox
  const collection = useMemo(() => {
    const filteredVideos =
      query === ""
        ? availableVideos
        : availableVideos.filter((video) =>
            video.title.toLowerCase().includes(query.toLowerCase())
          );

    return createListCollection({
      items: filteredVideos,
      itemToValue: (item) => item.url,
      itemToString: (item) => item.title,
    });
  }, [availableVideos, query]);

  const handleVideoSelect = (details: { value: string[] }) => {
    const url = details.value[0] || "";
    setSelectedVideoUrl(url);
    setValidationError(null);

    const extractedVideoId = extractVideoId(url);
    if (extractedVideoId) {
      if (value) {
        onSelect(value, extractedVideoId);
      } else {
        onSelect("0", extractedVideoId);
      }
    }
  };

  const extractVideoId = (url: string): string | null => {
    try {
      const match = url.match(/embed\/([^/]+\/[^/?]+)/);
      return match ? match[1] : null;
    } catch (e) {
      console.error("Error extracting video ID:", e);
      return null;
    }
  };

  const handleTimeSelect = (time: string) => {
    const extractedVideoId = extractVideoId(selectedVideoUrl);
    if (extractedVideoId) {
      onSelect(time, extractedVideoId);
    } else {
      onSelect(time);
    }
    setShowModal(false);
  };

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .video-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .video-item[data-highlighted] .video-indicator {
      color: white;
    }
    .video-item[data-state="checked"] .video-indicator {
      display: flex;
    }
    .video-item .video-indicator {
      display: none;
    }
    .video-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="space-y-4">
      <style>{comboboxItemStyles}</style>

      <div className="space-y-2">
        <label className="block text-sm text-gray-700 font-bold">Select a Video</label>

        <Combobox.Root
          collection={collection}
          value={selectedVideoUrl ? [selectedVideoUrl] : []}
          onValueChange={handleVideoSelect}
          onInputValueChange={(details) => setQuery(details.inputValue)}
          loopFocus={true}
          openOnKeyPress={true}
          composite={true}
        >
          <div className="relative">
            <Combobox.Input
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-myblue focus:ring-myblue"
              placeholder={placeholder}
              autoComplete="off"
            />
            <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </Combobox.Trigger>
          </div>

          <Combobox.Content className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {availableVideos.length > 0 ? (
              collection.items.length === 0 ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  No videos found matching your search.
                </div>
              ) : (
                collection.items.map((video) => (
                  <Combobox.Item
                    key={video.videoId}
                    item={video}
                    className="video-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
                  >
                    <span className="block truncate">{video.title}</span>
                    <span className="video-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                      <CheckIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </Combobox.Item>
                ))
              )
            ) : (
              <div className="py-2 px-4 text-sm text-gray-500 italic">
                No videos found on this page
              </div>
            )}
          </Combobox.Content>
        </Combobox.Root>

        {validationError && <p className="text-sm text-red-500 mt-1">{validationError}</p>}

        {!availableVideos.length && (
          <div className="text-sm text-gray-500 mt-2">
            <p>No videos found on this page. Please add a Bunny Video component first.</p>
          </div>
        )}
      </div>

      {selectedVideoUrl && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-700 font-bold">{label}</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-sm text-gray-500">
              {value ? `Current start time: ${value}s` : "No start time selected"}
            </div>
            {value !== "" && (
              <button
                onClick={() => handleTimeSelect(value)}
                className="px-4 py-2 bg-myblue text-white rounded hover:bg-blue-600"
              >
                Start at {value}s
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-myorange text-white rounded hover:bg-orange-600"
            >
              Find Time
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <TimeSelectModal
          videoUrl={selectedVideoUrl}
          onClose={() => setShowModal(false)}
          onSelect={handleTimeSelect}
        />
      )}
    </div>
  );
}
