import { useState, useRef, Fragment } from "react";
import { Dialog, Transition, RadioGroup } from "@headlessui/react";
import CheckCircleIcon from "@heroicons/react/20/solid/CheckIcon";
import { formatPrompt, pagePrompts, pagePromptsDetails } from "../../../../../config/prompts.json";
import PageCreationPreview from "./PageCreationGen_preview";
import type { NodesContext } from "@/store/nodes";
import type { FinalModel } from "@/utils/aai/askLemur";
import type { StoryFragmentNode, PageDesign } from "@/types";
import { parsePageMarkdown, createPagePanes } from "@/utils/designs/processMarkdown";

type PromptType = keyof typeof pagePrompts;

interface GenerationResponse {
  success: boolean;
  data?: {
    response: string;
  };
  error?: string;
}

type GenerationStatus = "idle" | "generating" | "success" | "error";

interface PageCreationGenProps {
  nodeId: string;
  ctx: NodesContext;
}

export const PageCreationGen = ({ nodeId, ctx }: PageCreationGenProps) => {
  const [selectedPromptType, setSelectedPromptType] = useState<PromptType>("landing");
  const [customizedPrompt, setCustomizedPrompt] = useState(pagePrompts[selectedPromptType]);
  const [referenceContext, setReferenceContext] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const dialogButtonRef = useRef<HTMLButtonElement>(null);

  const handlePromptTypeChange = (type: PromptType) => {
    setSelectedPromptType(type);
    setCustomizedPrompt(pagePrompts[type]);
  };

  const handleGenerate = async () => {
    setShowModal(true);
    setGenerationStatus("generating");
    setError(null);

    const finalPrompt = `${formatPrompt}

Writing Style Instructions:
${customizedPrompt}

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
      //setGeneratedContent(
      //  "## Unleash the Power of the Human-Animal Bond\n\nEmbark on an extraordinary journey that celebrates the profound connection between humans and their canine companions. Discover a world where heartwarming tales, expert insights, and transformative experiences converge, unveiling the magic that unfolds when two kindred spirits unite.\n\n### Pawsitive Care: Nurturing Your Furry Friend\n\nUnlock the secrets to providing your beloved pet with the utmost care and attention they deserve. Explore a treasure trove of expert tips and advice tailored to nurture their physical and mental well-being, ensuring a lifetime of happiness and companionship.\n\n### Enduring Connections: A Tale of Friendship and Growth\n\nJoin Dagr and his human companion as they navigate life's unexpected twists and turns, forging an unbreakable bond that transcends the boundaries of species. Witness their inspiring story of resilience, personal growth, and the transformative power of unconditional love.\n\n### Humane-Canine Bond: Exploring the Magical Connection\n\nDelve into the extraordinary realm where humans and animals connect on a profound level. Uncover the scientific and emotional underpinnings of this magical bond, and discover how it enriches our lives in ways we never imagined.\n\n#### Our Tale Begins Here!\nEmbark on a captivating journey that unveils the origins of Dagr's unique name and the spark that ignited this incredible adventure. Prepare to be inspired by the extraordinary bond that blossomed between a human and their canine companion.\n\n### Behind The Ink: Navigating Life's Challenges with Empathy\n\nGain invaluable insights from a sensitive soul who navigates life's complexities with introspection and empathy. Explore the rich tapestry of human experiences through the lens of an introverted and highly sensitive person, offering a unique perspective on mental health, self-discovery, and the healing power of the human-animal bond."
      //);
      setGenerationStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setGenerationStatus("error");
    }
  };

  const handleModalClose = () => {
    if (generationStatus === "generating") {
      return;
    }
    if (generationStatus === "success") {
      setShowModal(false);
      setShowPreview(true);
      return;
    }
    setShowModal(false);
    setGenerationStatus("idle");
  };

  const handlePreviewApply = async (
    previewCtx: NodesContext,
    markdownContent: string,
    design: PageDesign
  ) => {
    // Get preview storyfragment and its panes
    const previewStoryfragment = previewCtx.allNodes.get().get("tmp") as StoryFragmentNode;
    if (!previewStoryfragment) return;

    // Process our markdown content into sections
    const processedPage = parsePageMarkdown(markdownContent);
    const paneIds = await createPagePanes(processedPage, design, ctx, true, nodeId);

    // Update the storyfragment with the new panes
    const storyfragment = ctx.allNodes.get().get(nodeId) as StoryFragmentNode;
    if (storyfragment) {
      storyfragment.paneIds = paneIds;
      storyfragment.isChanged = true;
      ctx.modifyNodes([storyfragment]);
      ctx.notifyNode("root");
    }

    setShowPreview(false);
  };

  if (showPreview && generatedContent) {
    return (
      <PageCreationPreview
        markdownContent={generatedContent}
        onComplete={handlePreviewApply}
        onBack={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="p-0.5 shadow-inner">
      <div className="p-6 bg-white rounded-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 font-action mb-6">
          Generate Page Content with AI
        </h2>

        <div className="space-y-8">
          {/* Prompt Type Selection */}
          <div className="w-full">
            <RadioGroup value={selectedPromptType} onChange={handlePromptTypeChange}>
              <RadioGroup.Label className="block text-sm font-bold text-gray-900 mb-4">
                Select Page Type
              </RadioGroup.Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(pagePromptsDetails).map(([key, details]) => (
                  <RadioGroup.Option
                    key={key}
                    value={key}
                    className={({ active, checked }) =>
                      `${active ? "ring-2 ring-cyan-600 ring-offset-2" : ""}
                      ${checked ? "bg-cyan-700 text-white" : "bg-white"}
                      relative flex cursor-pointer rounded-lg px-5 py-4 shadow-md focus:outline-none`
                    }
                  >
                    {({ checked }) => (
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center">
                          <div className="text-sm">
                            <RadioGroup.Label
                              as="p"
                              className={`font-bold ${checked ? "text-white" : "text-gray-900"}`}
                            >
                              {details.title}
                            </RadioGroup.Label>
                            <RadioGroup.Description
                              as="span"
                              className={`inline ${checked ? "text-cyan-100" : "text-gray-500"}`}
                            >
                              {details.description}
                            </RadioGroup.Description>
                          </div>
                        </div>
                        {checked && (
                          <div className="shrink-0 text-white">
                            <CheckCircleIcon className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                    )}
                  </RadioGroup.Option>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Customizable Prompt */}
          <div>
            <label htmlFor="customPrompt" className="block text-sm font-bold text-gray-900 mb-2">
              Customize Writing Style (Optional)
            </label>
            <textarea
              id="customPrompt"
              rows={6}
              className="p-3.5 w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
              value={customizedPrompt}
              onChange={(e) => setCustomizedPrompt(e.target.value)}
              maxLength={1000}
            />
          </div>

          {/* Reference Context */}
          <div>
            <label htmlFor="referenceContext" className="block text-sm font-bold text-gray-900">
              Reference Content &ndash; copy and paste dump here; no formatting required...
            </label>
            <textarea
              id="referenceContext"
              rows={8}
              className="p-3.5 w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
              value={referenceContext}
              onChange={(e) => setReferenceContext(e.target.value)}
              maxLength={200000}
              placeholder="Paste your reference content here..."
            />
          </div>

          {/* Additional Instructions */}
          <div>
            <label
              htmlFor="additionalInstructions"
              className="block text-sm font-bold text-gray-900 mb-2"
            >
              Additional Instructions (Optional)
            </label>
            <textarea
              id="additionalInstructions"
              rows={4}
              className="p-3.5 w-full rounded-md border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500"
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              maxLength={2000}
              placeholder="Any additional instructions or requirements..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end items-center pt-4">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!referenceContext.trim() || generationStatus === "generating"}
                className={`px-4 py-2 text-sm font-bold text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 ${
                  referenceContext.trim() && generationStatus !== "generating"
                    ? "bg-cyan-600 hover:bg-cyan-700"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                {generationStatus === "generating" ? "Generating..." : "Generate Content"}
              </button>
            </div>
          </div>
        </div>

        {/* Generation Result Modal */}
        <Transition appear show={showModal} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-10 overflow-y-auto"
            onClose={handleModalClose}
            initialFocus={dialogButtonRef}
          >
            <div className="min-h-screen px-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
              </Transition.Child>

              <span className="inline-block h-screen align-middle" aria-hidden="true">
                &#8203;
              </span>

              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900">
                    {generationStatus === "error"
                      ? "Generation Error"
                      : generationStatus === "success"
                        ? "Content Generated"
                        : "Generating Content"}
                  </Dialog.Title>

                  <div className="mt-2">
                    {generationStatus === "error" ? (
                      <p className="text-sm text-red-600">{error}</p>
                    ) : generationStatus === "success" ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          Content has been generated successfully!
                        </p>
                        <div className="max-h-60 overflow-y-auto p-3 bg-gray-50 rounded-md">
                          <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                            {generatedContent}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-600"></div>
                        <p className="text-sm text-gray-500">Generating your page content...</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <button
                      ref={dialogButtonRef}
                      type="button"
                      className="inline-flex justify-center px-4 py-2 text-sm font-bold text-white bg-cyan-600 border border-transparent rounded-md hover:bg-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-500"
                      onClick={handleModalClose}
                      disabled={generationStatus === "generating"}
                    >
                      {generationStatus === "error"
                        ? "Try Again"
                        : generationStatus === "success"
                          ? "Continue"
                          : "Cancel"}
                    </button>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </div>
    </div>
  );
};

export default PageCreationGen;
