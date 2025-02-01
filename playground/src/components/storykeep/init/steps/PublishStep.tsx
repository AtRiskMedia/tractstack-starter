import { useState, useEffect } from "react";
import ArrowLeftIcon from "@heroicons/react/24/outline/ArrowLeftIcon";
import PublishModal from "../PublishModal";
import type { Config } from "@/types";

interface PublishStepProps {
  onComplete: () => void;
  onBack: () => void;
  isActive: boolean;
  hasConcierge: boolean;
  config: Config | null;
  isProcessing: boolean;
  onConfigUpdate: (updates: Record<string, unknown>) => void;
  needsPublish: boolean;
}

export default function PublishStep({
  onComplete,
  onBack,
  isActive,
  hasConcierge,
  isProcessing,
  needsPublish,
}: PublishStepProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conciergeActive, setConciergeActive] = useState(false);
  const [lastBuild, setLastBuild] = useState<number>(0);
  const [showPublishModal, setShowPublishModal] = useState(false);

  useEffect(() => {
    async function checkConciergeStatus() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/concierge/status");
        if (!response.ok) {
          throw new Error("Failed to check concierge status");
        }
        const result = await response.json();
        const status = JSON.parse(result.data);
        setConciergeActive(status.status === "active" && status.lastBuild > 0);
        setLastBuild(status.lastBuild);
      } catch (err) {
        setError("Concierge not found. Please review our docs.");
        console.error("Error checking concierge status:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (isActive && hasConcierge) {
      checkConciergeStatus();
    }
  }, [isActive, hasConcierge]);

  if (!isActive) return null;

  const handlePublish = () => {
    if (hasConcierge && !conciergeActive) {
      setError("Concierge not found. Please review our docs.");
      return;
    }
    setShowPublishModal(true);
  };

  const handlePublishComplete = () => {
    setShowPublishModal(false);
    onComplete();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={onBack} className="text-mydarkgrey hover:text-myblue flex items-center">
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back
        </button>
        <h3 className="text-xl font-bold text-mydarkgrey">This is your Story Keep</h3>
      </div>

      <div className="p-4 bg-myblue/5 rounded-lg">
        <div className="space-y-4">
          {error ? (
            <div className="p-4 bg-myred/10 text-myred rounded-md">{error}</div>
          ) : (
            <>
              {hasConcierge && needsPublish ? (
                <>
                  <p className="text-mydarkgrey">
                    Your configuration changes require a site rebuild to take effect.
                  </p>
                  {lastBuild > 0 && (
                    <p className="text-sm text-mydarkgrey">
                      Last Build: {new Date(lastBuild * 1000).toLocaleString()}
                    </p>
                  )}
                  <p className="text-mydarkgrey">
                    Click the button below to trigger a rebuild. It may take 1-2 minutes to
                    complete.
                  </p>
                  <button
                    onClick={handlePublish}
                    disabled={isProcessing || isLoading}
                    className="px-4 py-2 text-white bg-myblue rounded hover:bg-black disabled:bg-mylightgrey"
                  >
                    {isLoading ? "Checking Status..." : "Publish Changes"}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-mydarkgrey">
                    Your {hasConcierge ? `Tract Stack` : `sandbox`} is ready!
                  </p>
                  {hasConcierge && lastBuild > 0 && (
                    <p className="text-sm text-mydarkgrey">
                      Last Build: {new Date(lastBuild * 1000).toLocaleString()}
                    </p>
                  )}
                  <button
                    onClick={onComplete}
                    disabled={isProcessing || isLoading}
                    className="px-4 py-2 text-white bg-myblue rounded hover:bg-black"
                  >
                    Continue
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showPublishModal && (
        <PublishModal
          onClose={() => setShowPublishModal(false)}
          onPublishComplete={handlePublishComplete}
          initialLastBuild={lastBuild}
        />
      )}
    </div>
  );
}
