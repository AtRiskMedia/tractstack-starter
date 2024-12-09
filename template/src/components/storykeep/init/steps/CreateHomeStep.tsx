import ArrowLeftIcon from "@heroicons/react/24/outline/ArrowLeftIcon";

interface CreateHomeStepProps {
  onComplete: () => void;
  onBack: () => void;
  isActive: boolean;
  isProcessing: boolean;
  onConfigUpdate: (updates: Record<string, unknown>) => void;
}

export default function CreateHomeStep({ onComplete, onBack, isActive }: CreateHomeStepProps) {
  if (!isActive) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={onBack} className="text-mydarkgrey hover:text-myblue flex items-center">
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back
        </button>
        <h3 className="text-xl font-bold text-mydarkgrey">Create Home Page</h3>
      </div>

      <div className="p-4 bg-myblue/5 rounded-lg">
        <div className="space-y-4">
          <div className="flex items-center justify-center p-8 border-2 border-dashed border-mylightgrey rounded-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-mydarkgrey mb-2">Coming Soon</h3>
              <p className="text-mydarkgrey">
                The ability to create your home page will be available in an upcoming update.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onComplete}
              className="px-4 py-2 text-white bg-myblue rounded hover:bg-black"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
