import { useState, useMemo } from "react";
import { RadioGroup } from "@ark-ui/react/radio-group";
import CheckCircleIcon from "@heroicons/react/20/solid/CheckCircleIcon";
import CubeTransparentIcon from "@heroicons/react/24/outline/CubeTransparentIcon";
import DocumentIcon from "@heroicons/react/24/outline/DocumentIcon";
import NewspaperIcon from "@heroicons/react/24/outline/NewspaperIcon";
import ExclamationTriangleIcon from "@heroicons/react/24/outline/ExclamationTriangleIcon";
import AddPanePanel from "./AddPanePanel";
import PageCreationGen from "./PageCreationGen";
import PageCreationSpecial from "./PageCreationSpecial";
import { hasAssemblyAIStore } from "@/store/storykeep";
import { contentMap } from "@/store/events.ts";
import { useStore } from "@nanostores/react";
import type { NodesContext } from "@/store/nodes";
import type { StoryFragmentContentMap } from "@/types";

interface PageCreationSelectorProps {
  nodeId: string;
  ctx: NodesContext;
  isTemplate?: boolean;
}

type CreationMode = {
  id: "design" | "generate" | "featured";
  name: string;
  description: string;
  icon: typeof DocumentIcon;
  active: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

export const PageCreationSelector = ({
  nodeId,
  ctx,
  isTemplate = false,
}: PageCreationSelectorProps) => {
  const [selectedMode, setSelectedMode] = useState<CreationMode["id"]>("design");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [showFeatured, setShowFeatured] = useState(false);
  const $contentMap = useStore(contentMap);

  const validPagesCount = useMemo(() => {
    return $contentMap.filter(
      (item): item is StoryFragmentContentMap =>
        item.type === "StoryFragment" &&
        typeof item.description === "string" &&
        typeof item.thumbSrc === "string" &&
        typeof item.thumbSrcSet === "string" &&
        typeof item.changed === "string"
    ).length;
  }, [$contentMap]);

  const modes = useMemo(() => {
    const baseModesWithoutFeature = [
      {
        id: "design",
        name: "Design from scratch",
        description: "Build your page section by section using our design system",
        icon: DocumentIcon,
        active: true,
      },
      ...(hasAssemblyAIStore.get()
        ? [
            {
              id: "generate",
              name: "Generate with AI",
              description: "Tell us what kind of page you want and AI will generate a first draft",
              icon: CubeTransparentIcon,
              active: hasAssemblyAIStore.get(),
            },
          ]
        : []),
    ];

    const featuredMode = {
      id: "featured",
      name: "Featured Content home page",
      description:
        "A layout with a prominent hero section showcasing a featured article and grid of additional top articles",
      icon: NewspaperIcon,
      active: true,
      disabled: validPagesCount < 3,
      disabledReason:
        validPagesCount === 0
          ? "Not yet available; no pages with SEO metadata found."
          : `Not yet available; requires at least 3 pages with SEO metadata (currently ${validPagesCount}).`,
    };

    return [...baseModesWithoutFeature, featuredMode] as CreationMode[];
  }, [validPagesCount]);

  const handleContinue = () => {
    if (!selectedMode) return;

    const selectedModeObj = modes.find((m) => m.id === selectedMode);
    if (selectedModeObj?.disabled) return;

    if (selectedMode === "design") {
      setShowTemplates(true);
    } else if (selectedMode === "generate") {
      setShowGen(true);
    } else if (selectedMode === "featured") {
      setShowFeatured(true);
    }
  };

  const radioGroupStyles = `
    .radio-control[data-state="unchecked"] .radio-dot {
      background-color: #d1d5db; /* gray-300 */
    }
    .radio-control[data-state="checked"] .radio-dot {
      background-color: #0891b2; /* cyan-600 */
    }
    .radio-control[data-state="checked"] {
      border-color: #0891b2; /* cyan-600 */
    }
    .radio-item[data-state="checked"] {
      background-color: #f9f9f9;
      color: white;
    }
    .radio-item[data-disabled="true"] {
      background-color: #f9fafb;
      cursor: not-allowed;
    }
  `;

  if (showTemplates || isTemplate)
    return <AddPanePanel nodeId={nodeId} first={true} ctx={ctx} isStoryFragment={true} />;
  else if (showGen) return <PageCreationGen nodeId={nodeId} ctx={ctx} />;
  else if (showFeatured) return <PageCreationSpecial nodeId={nodeId} ctx={ctx} />;

  return (
    <div className="p-0.5 shadow-inner">
      <style>{radioGroupStyles}</style>
      <div className="p-6 bg-white rounded-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 font-action mb-6">
          How would you like to create your page?
        </h2>

        <div className="w-full max-w-3xl">
          <RadioGroup.Root
            defaultValue="design"
            onValueChange={(details) => {
              if (details.value) {
                setSelectedMode(details.value as CreationMode["id"]);
              }
            }}
          >
            <RadioGroup.Label className="sr-only">Page Creation Mode</RadioGroup.Label>
            <div className="space-y-4">
              {modes.map((mode) => (
                <RadioGroup.Item
                  key={mode.id}
                  value={mode.id}
                  disabled={mode.disabled}
                  className={`radio-item relative flex cursor-pointer rounded-lg px-5 py-6 shadow-md focus:outline-none ${
                    mode.disabled
                      ? "bg-gray-50"
                      : "bg-white hover:ring-2 hover:ring-cyan-600 hover:ring-offset-2"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {mode.disabled ? (
                          <ExclamationTriangleIcon
                            className="h-8 w-8 text-amber-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <mode.icon
                            className="h-8 w-8 text-cyan-700 data-[state=checked]:text-white"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="ml-4">
                        <RadioGroup.ItemText>
                          <p
                            className={`font-bold ${mode.disabled ? "text-gray-400" : "text-gray-900 data-[state=checked]:text-white"}`}
                          >
                            {mode.name}
                          </p>
                          <span
                            className={`inline ${mode.disabled ? "text-gray-400" : "text-gray-500 data-[state=checked]:text-cyan-100"}`}
                          >
                            {mode.description}
                            {mode.disabled && mode.disabledReason && (
                              <span className="block mt-1 text-amber-500 font-bold">
                                {mode.disabledReason}
                              </span>
                            )}
                          </span>
                        </RadioGroup.ItemText>
                      </div>
                    </div>
                    <div className="shrink-0 text-white hidden data-[state=checked]:block">
                      <CheckCircleIcon className="h-6 w-6" />
                    </div>
                  </div>
                  <RadioGroup.ItemControl className="radio-control h-4 w-4 rounded-full border border-gray-300 mr-2 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full radio-dot" />
                  </RadioGroup.ItemControl>
                  <RadioGroup.ItemHiddenInput />
                </RadioGroup.Item>
              ))}
            </div>
          </RadioGroup.Root>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex justify-center rounded-md bg-cyan-700 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default PageCreationSelector;
