import { useState, useEffect } from "react";

interface SetupStepProps {
  onComplete: () => void;
  onBack: () => void;
  isActive: boolean;
  hasConcierge: boolean;
  isProcessing: boolean;
  onConfigUpdate: (updates: Record<string, unknown>) => void;
}

export default function SetupStep({ onComplete, isActive, hasConcierge }: SetupStepProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conciergeActive, setConciergeActive] = useState(false);
  const [lastBuild, setLastBuild] = useState<number>(0);

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
    else setIsLoading(false)
  }, [isActive, hasConcierge]);

  if (!isActive) return null;

  const handleStartSetup = () => {
    if (hasConcierge && !conciergeActive) {
      setError("Concierge not found. Please review our docs.");
      return;
    }
    onComplete();
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-myblue/5 rounded-lg">
        <h3 className="text-xl font-bold text-mydarkgrey mb-4">
          {hasConcierge ? "Setup Story Keep" : "Demo Mode"}
        </h3>

        <div className="space-y-4 text-mydarkgrey">
          {error ? (
            <div className="p-4 bg-myred/10 text-myred rounded-md">{error}</div>
          ) : (
            <>
              <p>
                {hasConcierge
                  ? "Your Story Keep is configured for production use. Continue to complete the setup."
                  : "Thank you for trying Tract Stack!"}
              </p>
              {hasConcierge && lastBuild > 0 && (
                <p className="text-sm text-mydarkgrey">
                  Last Build: {new Date(lastBuild * 1000).toLocaleString()}
                </p>
              )}
            </>
          )}

          <button
            onClick={handleStartSetup}
            disabled={isLoading || (hasConcierge && !conciergeActive)}
            className="px-4 py-2 text-white bg-myblue rounded hover:bg-black disabled:bg-mylightgrey"
          >
            {isLoading ? "Checking Status..." : "Continue Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}
