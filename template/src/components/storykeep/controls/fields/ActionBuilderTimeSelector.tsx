import { useState, useEffect } from "react";

// Add type definitions for Player.js
declare global {
  interface Window {
    playerjs: {
      Player: new (elementId: string) => Player;
    };
  }
}

interface Player {
  on(event: string, callback: (data: any) => void): void;
  off(event: string): void;
  getCurrentTime(callback: (time: number) => void): void;
}

interface ActionBuilderTimeSelectorProps {
  value: string;
  onSelect: (value: string) => void;
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
  const [playerInstance, setPlayerInstance] = useState<any>(null);

  useEffect(() => {
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
  );
}

export default function ActionBuilderTimeSelector({
  value,
  onSelect,
  label,
  placeholder = `https://iframe.mediadelivery.net/embed/{library}/{videoId}`,
}: ActionBuilderTimeSelectorProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [showModal, setShowModal] = useState(false);

  const handleTimeSelect = (time: string) => {
    onSelect(time);
    setShowModal(false);
  };

  const isValidBunnyUrl = (url: string) => {
    return url.startsWith("https://iframe.mediadelivery.net/embed/") && url.includes("/");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm text-gray-700">Bunny Video URL</label>
        <input
          type="text"
          className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-myblue focus:ring-myblue"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder={placeholder}
        />
      </div>

      {isValidBunnyUrl(videoUrl) && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-700">{label}</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-sm text-gray-500">
              {value ? `Current start time: ${value}s` : "No start time selected"}
            </div>
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
