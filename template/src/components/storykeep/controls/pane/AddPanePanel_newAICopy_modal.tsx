import { useRef, useState, useEffect } from "react";
import { Dialog } from "@ark-ui/react/dialog";
import { Portal } from "@ark-ui/react/portal";
import type { FinalModel } from "@/utils/aai/askLemur";
import { paneFormatPrompt, formatPrompt } from "../../../../../config/prompts.json";

interface GenerationResponse {
  success: boolean;
  data?: {
    response: string;
  };
  error?: string;
}

type GenerationStatus = "idle" | "generating" | "success" | "error";

interface AddPaneNewAICopyModalProps {
  show: boolean;
  onClose: () => void;
  prompt: string;
  referenceContext: string;
  additionalInstructions: string;
  onChange: (value: string) => void;
  isContextPane: boolean;
}

export const AddPanePanel_newAICopy_modal = ({
  show,
  onClose,
  prompt,
  referenceContext,
  additionalInstructions,
  onChange,
  isContextPane,
}: AddPaneNewAICopyModalProps) => {
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const dialogButtonRef = useRef<HTMLButtonElement>(null);

  const handleModalClose = (details: { open: boolean }) => {
    if (generationStatus === "generating") {
      return;
    }
    if (generationStatus === "success" && generatedContent && !details.open) {
      onChange(generatedContent);
      onClose();
      // Reset state after closing
      setGenerationStatus("idle");
      setGeneratedContent(null);
      setError(null);
      return;
    }
    onClose();
    setGenerationStatus("idle");
  };

  const handleButtonClick = () => {
    if (generationStatus === "success" && generatedContent) {
      onChange(generatedContent);
      onClose();
      // Reset state after closing
      setGenerationStatus("idle");
      setGeneratedContent(null);
      setError(null);
    } else if (generationStatus === "error") {
      onClose();
      setGenerationStatus("idle");
    }
  };

  const handleGenerate = async () => {
    setGenerationStatus("generating");
    setError(null);

    const finalPrompt = `${isContextPane ? formatPrompt : paneFormatPrompt}

Writing Style Instructions:
${prompt}

Additional Instructions:
${additionalInstructions}`;

    try {
      const response = await fetch("/api/aai/askLemur", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          input_text: referenceContext,
          final_model: "anthropic/claude-3-sonnet" as FinalModel,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      const result = (await response.json()) as GenerationResponse;

      if (!result.success || !result.data?.response) {
        throw new Error(result.error || "Generation failed");
      }

      setGeneratedContent(result.data.response);
      setGenerationStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setGenerationStatus("error");
    }
  };

  useEffect(() => {
    if (show && generationStatus === "idle") {
      handleGenerate();
    }
  }, [show]);

  // CSS for Dialog styles
  const dialogStyles = `
    [data-part="backdrop"] {
      background-color: rgba(0, 0, 0, 0.3);
    }
    [data-part="content"] {
      background-color: white;
      border-radius: 1rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      padding: 1.5rem;
      max-width: 42rem;
      width: 100%;
    }
    [data-part="title"] {
      font-size: 1.125rem;
      font-weight: bold;
      color: #1f2937;
    }
  `;

  return (
    <>
      <style>{dialogStyles}</style>
      <Dialog.Root open={show} onOpenChange={handleModalClose}>
        <Portal>
          <Dialog.Backdrop className="fixed inset-0" />
          <Dialog.Positioner className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <Dialog.Content className="text-left overflow-hidden">
              <Dialog.Title className="text-lg font-bold leading-6 text-gray-900">
                {generationStatus === "error"
                  ? "Generation Error"
                  : generationStatus === "success"
                    ? "Content Generated"
                    : "Generating Content"}
              </Dialog.Title>

              <div className="mt-4">
                {generationStatus === "error" ? (
                  <p className="text-sm text-red-600">{error}</p>
                ) : generationStatus === "success" ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Content has been generated successfully! Click "Apply Content" to use this
                      content with your selected design.
                    </p>
                    <div className="max-h-[60vh] overflow-y-auto p-4 bg-gray-50 rounded-md border border-gray-200">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                        {generatedContent}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600"></div>
                    <p className="text-sm text-gray-500">Generating your content...</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {generationStatus !== "generating" && (
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
                    onClick={() => {
                      onClose();
                      setGenerationStatus("idle");
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  ref={dialogButtonRef}
                  type="button"
                  className="inline-flex justify-center px-4 py-2 text-sm font-bold text-white bg-cyan-600 border border-transparent rounded-md hover:bg-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  onClick={handleButtonClick}
                  disabled={generationStatus === "generating"}
                >
                  {generationStatus === "error"
                    ? "Try Again"
                    : generationStatus === "success"
                      ? "Apply Content"
                      : "Please Wait..."}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
};
