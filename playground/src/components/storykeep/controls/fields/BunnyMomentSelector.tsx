import { useState, useEffect } from "react";
import ActionBuilderTimeSelector from "./ActionBuilderTimeSelector";

interface BunnyMomentSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function BunnyMomentSelector({ value, onChange }: BunnyMomentSelectorProps) {
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [timestamp, setTimestamp] = useState("0");

  useEffect(() => {
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

  const handleTimeSelect = (time: string, videoId?: string) => {
    if (videoId) {
      setSelectedVideoId(videoId);
    }
    setTimestamp(time);
    updateValue(videoId || selectedVideoId, time);
  };

  const updateValue = (videoId: string, time: string) => {
    if (!videoId) return;
    onChange(`(bunnyMoment (${videoId} ${time}))`);
  };

  return (
    <div className="space-y-4">
      <ActionBuilderTimeSelector
        value={timestamp}
        videoId={selectedVideoId}
        onSelect={handleTimeSelect}
        label="Bunny Video Moment"
        placeholder="Select a video and timestamp"
      />
    </div>
  );
}
