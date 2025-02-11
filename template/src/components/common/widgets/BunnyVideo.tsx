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

  // Build URL with default parameters for preview
  const videoUrl = new URL(embedUrl);
  videoUrl.searchParams.set("autoplay", "0");
  videoUrl.searchParams.set("preload", "false");
  videoUrl.searchParams.set("responsive", "true");

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
