import { useState, useEffect, useRef } from "react";
import { classNames } from "@/utils/common/helpers";

type PublishStage = "TRIGGER_PUBLISH" | "AWAIT_PUBLISH" | "PUBLISHING" | "PUBLISHED" | "ERROR";

interface PublishModalProps {
  onClose: () => void;
  onPublishComplete?: () => void;
  initialLastBuild: number;
}

const PUBLISH_CHECK_INTERVALS = [40000, 20000, 10000, 5000];

export default function PublishModal({
  onClose,
  onPublishComplete,
  initialLastBuild,
}: PublishModalProps) {
  const [stage, setStage] = useState<PublishStage>("TRIGGER_PUBLISH");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const checkIntervalRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/concierge/status");
        if (!response.ok) throw new Error("Failed to check status");
        const result = await response.json();
        const status = JSON.parse(result.data);
        return status;
      } catch (err) {
        throw new Error("Failed to check concierge status");
      }
    };

    const scheduleNextCheck = (delay: number) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(monitorStatus, delay);
    };

    const monitorStatus = async () => {
      try {
        const status = await checkStatus();

        switch (stage) {
          case "TRIGGER_PUBLISH":
            // Initiate publish
            const publishResponse = await fetch("/api/concierge/publish", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ target: "all" }),
            });
            if (!publishResponse.ok) throw new Error("Failed to trigger publish");
            setStage("AWAIT_PUBLISH");
            setProgress(20);
            scheduleNextCheck(2000);
            break;

          case "AWAIT_PUBLISH":
            if (status.status === "building") {
              setStage("PUBLISHING");
              setProgress(40);
              checkIntervalRef.current = 0;
              scheduleNextCheck(PUBLISH_CHECK_INTERVALS[0]);
            } else {
              scheduleNextCheck(2000);
            }
            break;

          case "PUBLISHING":
            if (status.status === "active") {
              setStage("PUBLISHED");
              setProgress(100);
              if (onPublishComplete) {
                setTimeout(onPublishComplete, 2000);
              }
            } else {
              // Keep checking while in building status
              if (status.status === "building") {
                const nextInterval = PUBLISH_CHECK_INTERVALS[checkIntervalRef.current + 1];
                if (nextInterval) {
                  checkIntervalRef.current++;
                  scheduleNextCheck(nextInterval);
                } else {
                  scheduleNextCheck(PUBLISH_CHECK_INTERVALS[PUBLISH_CHECK_INTERVALS.length - 1]);
                }
                // Calculate progress based on time elapsed since build started
                const elapsed = status.now - status.lastBuild;
                const estimatedBuildTime = 120; // 2 minutes estimated build time
                const buildProgress = Math.min((elapsed / estimatedBuildTime) * 60, 60); // Max 60% during building
                setProgress(40 + buildProgress);
              } else {
                // If not building but not active, keep checking
                scheduleNextCheck(5000);
              }
            }
            break;
        }
      } catch (err) {
        setStage("ERROR");
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      }
    };

    if (stage !== "PUBLISHED" && stage !== "ERROR") {
      monitorStatus();
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [stage, onPublishComplete]);

  const getStageDescription = (currentStage: PublishStage) => {
    switch (currentStage) {
      case "TRIGGER_PUBLISH":
        return "Initiating publish...";
      case "AWAIT_PUBLISH":
        return "Waiting for publish to begin...";
      case "PUBLISHING":
        return "Publishing changes...";
      case "PUBLISHED":
        return "Changes published successfully!";
      case "ERROR":
        return `Error: ${error}`;
      default:
        return "";
    }
  };

  return (
    <div className="fixed inset-0 z-[10101] bg-black/50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full m-4">
        <h2 className="text-2xl font-bold mb-4">Publishing Changes</h2>

        <div className="mb-4">
          <div className="h-2 bg-mylightgrey rounded-full">
            <div
              className={classNames(
                "h-full rounded-full",
                stage === "PUBLISHED" ? "bg-mygreen" : "bg-myblue",
                stage === "ERROR" ? "bg-myred" : ""
              )}
              style={{
                width: `${progress}%`,
                transition: "width 500ms ease-out",
                animation: stage === "PUBLISHING" ? "pulse 2s ease-in-out infinite" : "none",
              }}
            />
          </div>
        </div>

        <p className="text-lg mb-4">{getStageDescription(stage)}</p>

        {(stage === "PUBLISHED" || stage === "ERROR") && (
          <div className="flex justify-end gap-2">
            {stage === "ERROR" && (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-myred text-white rounded hover:bg-myred/80"
              >
                Reload Page
              </button>
            )}
            <button
              onClick={onClose}
              className={classNames(
                "px-4 py-2 rounded",
                stage === "PUBLISHED"
                  ? "bg-mygreen text-white hover:bg-mygreen/80"
                  : "bg-mylightgrey text-white hover:bg-mylightgrey/80"
              )}
            >
              {stage === "PUBLISHED" ? "Close" : "Cancel"}
            </button>
          </div>
        )}

        <style>{`
          @keyframes pulse {
            0% { width: ${progress}%; }
            50% { width: ${Math.min(progress + 10, 95)}%; }
            100% { width: ${progress}%; }
          }
        `}</style>
      </div>
    </div>
  );
}
