import { useState, useEffect } from "react";
import { type BunnyPlayer, hasPlayerJS } from "@/types";
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
        <h3 className="text-lg font-semibold mb-4">Select Video Start Time</h3>
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
  placeholder = "https://iframe.mediadelivery.net/embed/{library}/{videoId}",
}: ActionBuilderTimeSelectorProps) {
  const [videoUrl, setVideoUrl] = useState(
    videoId ? `https://iframe.mediadelivery.net/embed/${videoId}` : ``
  );
  const [showModal, setShowModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const extractVideoId = (url: string): string | null => {
    try {
      const match = url.match(/embed\/([^/]+\/[^/?]+)/);
      return match ? match[1] : null;
    } catch (e) {
      console.error("Error extracting video ID:", e);
      return null;
    }
  };

  const handleUrlChange = (url: string) => {
    setVideoUrl(url);
    setValidationError(null);

    const videoId = extractVideoId(url);
    if (!videoId && url) {
      setValidationError("Invalid Bunny Stream URL format");
    }
  };

  const handleTimeSelect = (time: string) => {
    const videoId = extractVideoId(videoUrl);
    if (videoId) {
      onSelect(time, videoId);
    } else {
      onSelect(time);
    }
    setShowModal(false);
  };

  const isValidBunnyUrl = (url: string): boolean => {
    return (
      url.startsWith("https://iframe.mediadelivery.net/embed/") && extractVideoId(url) !== null
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm text-gray-700">Bunny Video URL</label>
        <input
          type="text"
          className={`w-full rounded-md border ${
            validationError ? "border-red-500" : "border-gray-300"
          } px-3 py-2 shadow-sm focus:border-myblue focus:ring-myblue`}
          value={videoUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder={placeholder}
        />
        {validationError && <p className="text-sm text-red-500 mt-1">{validationError}</p>}
      </div>

      {isValidBunnyUrl(videoUrl) && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">{label}</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-sm text-gray-500">
              {value ? `Current start time: ${value}s` : "No start time selected"}
            </div>
            {value !== "" && (
              <button
                onClick={() => handleTimeSelect(value)}
                className="px-4 py-2 bg-myblue text-white rounded hover:bg-orange-600"
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
          videoUrl={videoUrl}
          onClose={() => setShowModal(false)}
          onSelect={handleTimeSelect}
        />
      )}
    </div>
  );
}
