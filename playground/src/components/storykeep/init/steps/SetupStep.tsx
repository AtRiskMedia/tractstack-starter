import { previewMode } from "../../../../store/storykeep";

interface SetupStepProps {
  onComplete: () => void;
  onBack: () => void;
  isActive: boolean;
  hasConcierge: boolean;
  isProcessing: boolean;
  onConfigUpdate: (updates: Record<string, unknown>) => void;
}

export default function SetupStep({ onComplete, isActive, hasConcierge }: SetupStepProps) {
  if (!isActive) return null;

  const handleStartSetup = () => {
    if (hasConcierge) {
      onComplete();
    } else {
      previewMode.set("true");
      onComplete();
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-myblue/5 rounded-lg">
        <h3 className="text-xl font-bold text-mydarkgrey mb-4">
          {hasConcierge ? "Setup Story Keep" : "Demo Mode"}
        </h3>

        <div className="space-y-4 text-mydarkgrey">
          <p>
            {hasConcierge
              ? "Your Story Keep is configured for production use. Continue to complete the setup."
              : "Thank you for trying Tract Stack!"}
          </p>

          <button
            onClick={handleStartSetup}
            className="px-4 py-2 text-white bg-myblue rounded hover:bg-black disabled:bg-mylightgrey"
          >
            Continue Setup
          </button>
        </div>
      </div>
    </div>
  );
}
