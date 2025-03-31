import { useState, useEffect } from "react";
import { getCtx } from "@/store/nodes";

interface BunnyMomentSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function BunnyMomentSelector({ value, onChange }: BunnyMomentSelectorProps) {
  const [videos, setVideos] = useState<{ videoId: string; title: string }[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [timestamp, setTimestamp] = useState("0");

  // Load available videos on mount
  useEffect(() => {
    const ctx = getCtx();
    const videoInfo = ctx.getAllBunnyVideoInfo();
    setVideos(videoInfo);

    // Try to parse existing value if any
    if (value) {
      try {
        const match = value.match(/\(bunnyMoment\s+\(\s*([^\s]+)\s+(\d+)\s*\)\)/);
        if (match) {
          setSelectedVideoId(match[1]);
          setTimestamp(match[2]);
        }
      } catch (e) {
        console.error("Error parsing value:", e);
      }
    }
  }, [value]);

  // Update when selection changes
  const handleVideoChange = (videoId: string) => {
    setSelectedVideoId(videoId);
    updateValue(videoId, timestamp);
  };

  const handleTimestampChange = (time: string) => {
    setTimestamp(time);
    updateValue(selectedVideoId, time);
  };

  const updateValue = (videoId: string, time: string) => {
    if (!videoId) return;
    onChange(`(bunnyMoment (${videoId} ${time}))`);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-700">Select Video</label>
        <select
          value={selectedVideoId}
          onChange={(e) => handleVideoChange(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="">Select a video...</option>
          {videos.map((video) => (
            <option key={video.videoId} value={video.videoId}>
              {video.title}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-700">Timestamp (seconds)</label>
        <input
          type="number"
          value={timestamp}
          onChange={(e) => handleTimestampChange(e.target.value)}
          min="0"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        />
      </div>
    </div>
  );
}
