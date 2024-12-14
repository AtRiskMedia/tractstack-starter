import { classNames } from "../../../utils/common/helpers";
import type { GenerateStage } from "../../../types";

interface GeneratePageModalProps {
  stage: GenerateStage;
}

const GeneratePageModal = ({ stage }: GeneratePageModalProps) => {
  const getStageDescription = (currentStage: GenerateStage) => {
    switch (currentStage) {
      case "GENERATING_COPY":
        return "Generating page content...";
      case "PREPARING_DESIGN":
        return "Preparing design...";
      case "LOADING_DESIGN":
        return "Loading design...";
      case "COMPLETED":
        return "Generation completed successfully!";
      case "ERROR":
        return "Error: Failed to generate page";
      default:
        return "";
    }
  };

  const getProgressWidth = (currentStage: GenerateStage) => {
    switch (currentStage) {
      case "GENERATING_COPY":
        return "w-3/12";
      case "PREPARING_DESIGN":
        return "w-6/12";
      case "LOADING_DESIGN":
        return "w-9/12";
      case "COMPLETED":
        return "w-full";
      case "ERROR":
        return "w-full";
      default:
        return "w-0";
    }
  };

  return (
    <div className="fixed inset-0 bg-mylightgrey bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Generating Page</h2>
        <div className="mb-4">
          <div className="h-2 bg-myoffwhite rounded-full">
            <div
              className={classNames(
                "h-full rounded-full transition-all duration-500",
                stage === "COMPLETED"
                  ? "bg-green-500"
                  : stage === "ERROR"
                    ? "bg-red-500"
                    : "bg-blue-500",
                getProgressWidth(stage)
              )}
            />
          </div>
        </div>
        <p className="text-lg mb-4">{getStageDescription(stage)}</p>
      </div>
    </div>
  );
};

export default GeneratePageModal;
