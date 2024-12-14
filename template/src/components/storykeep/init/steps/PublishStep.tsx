import ArrowLeftIcon from "@heroicons/react/24/outline/ArrowLeftIcon";
import type { Config } from "../../../../types";

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
  if (!isActive) return null;

  const handlePublish = async () => {
    try {
      onComplete();
    } catch (error) {
      console.error("Error in publish step:", error);
    }
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
          {hasConcierge && needsPublish ? (
            <>
              <p className="text-mydarkgrey">
                Your configuration changes require a site rebuild to take effect. Click the button
                below to trigger a rebuild. It may take 1-2 minutes to complete.
              </p>
              <button
                onClick={handlePublish}
                disabled={isProcessing}
                className="px-4 py-2 text-white bg-myblue rounded hover:bg-black disabled:bg-mylightgrey"
              >
                {isProcessing ? "Publishing..." : "Publish Changes"}
              </button>
            </>
          ) : (
            <>
              <p className="text-mydarkgrey">
                Your {hasConcierge ? `Tract Stack` : `sandbox`} is ready!
              </p>
              <button
                onClick={handlePublish}
                disabled={isProcessing}
                className="px-4 py-2 text-white bg-myblue rounded hover:bg-black"
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
