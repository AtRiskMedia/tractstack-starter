import { useState, useEffect } from "react";
import { getBunnyPlayer } from "@/utils/bunny/player";

interface BunnyVideoProps {
  embedUrl: string;
  title: string;
  className?: string;
}

const BunnyVideo = ({ embedUrl, title, className = "" }: BunnyVideoProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const iframeId = "bunny-stream-preview";

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const loadVideo = () => {
      // Skip player setup if there's no valid URL
      if (!isValidUrl(embedUrl)) {
        setError("Invalid video URL");
        setIsLoading(false);
        return;
      }

      const player = getBunnyPlayer(iframeId);

      if (!player) {
        setError("Failed to initialize video player");
        setIsLoading(false);
        return;
      }

      // When player is ready, set up event handlers
      player.on("ready", () => {
        setIsLoading(false);

        // Handle playback errors
        player.on("error", (err: any) => {
          console.error("Bunny video error:", err);
          setError("Failed to load video");
        });
      });

      return () => {
        player.off("error");
      };
    };

    // Small delay to ensure iframe is mounted
    const timeoutId = setTimeout(loadVideo, 100);
    return () => clearTimeout(timeoutId);
  }, [embedUrl]);

  // Check if a string is a valid URL
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Render placeholder when URL is invalid
  if (!isValidUrl(embedUrl)) {
    return (
      <div
        className={`w-full aspect-video bg-gray-100 flex items-center justify-center ${className}`}
      >
        <div className="text-center p-4">
          <div className="text-mydarkgrey mb-2">Video URL not set</div>
          <div className="text-sm text-mygrey">
            Configure this widget with a valid Bunny Stream URL
          </div>
        </div>
      </div>
    );
  }

  // Build URL with default parameters for preview
  let videoUrl;
  try {
    videoUrl = new URL(embedUrl);
    videoUrl.searchParams.set("autoplay", "0");
    videoUrl.searchParams.set("preload", "false");
    videoUrl.searchParams.set("responsive", "true");
  } catch (e) {
    // This should never happen due to our check above, but just in case
    return (
      <div
        className={`w-full aspect-video bg-gray-100 flex items-center justify-center ${className}`}
      >
        <div className="text-center text-mydarkgrey">Invalid video URL</div>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-myorange"></div>
            <span className="mt-2 text-sm text-mydarkgrey">Loading video...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-mydarkgrey">
            <span className="block text-sm">{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-myblue hover:text-myorange"
            >
              Reload page
            </button>
          </div>
        </div>
      )}

      <iframe
        id={iframeId}
        src={videoUrl.toString()}
        className="w-full aspect-video"
        title={title}
        allow="autoplay; fullscreen"
        style={{ opacity: isLoading ? 0 : 1 }}
      />
    </div>
  );
};

export default BunnyVideo;
