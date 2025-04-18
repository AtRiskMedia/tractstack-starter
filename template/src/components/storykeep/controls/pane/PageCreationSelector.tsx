import { useState, useMemo } from "react";
import { RadioGroup } from "@headlessui/react";
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

interface PageCreationSelectorProps {
  nodeId: string;
  ctx: NodesContext;
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

export const PageCreationSelector = ({ nodeId, ctx }: PageCreationSelectorProps) => {
  const [selected, setSelected] = useState<CreationMode["id"]>("design");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [showFeatured, setShowFeatured] = useState(false);
  const $contentMap = useStore(contentMap);

  const hasStoryFragments = useMemo(() => {
    return $contentMap.some((item) => item.type === "StoryFragment");
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
              description: "Let AI help you create a complete page from your description",
              icon: CubeTransparentIcon,
              active: hasAssemblyAIStore.get(),
            },
          ]
        : []),
    ];

    const featuredMode = {
      id: "featured",
      name: "Featured Content home page",
      description: hasStoryFragments
        ? "A layout with a prominent hero section showcasing a featured article and grid of additional top articles."
        : "A layout with a prominent hero section showcasing a featured article and grid of additional top articles.",
      icon: NewspaperIcon,
      active: true,
      disabled: !hasStoryFragments,
      disabledReason: "Not yet available; no pages found.",
    };

    return [...baseModesWithoutFeature, featuredMode] as CreationMode[];
  }, [hasStoryFragments]);

  const handleModeSelect = (mode: CreationMode["id"]) => {
    const selectedMode = modes.find((m) => m.id === mode);
    if (selectedMode?.disabled) return;
    setSelected(mode);
    setShowTemplates(false);
    setShowGen(false);
    setShowFeatured(false);
  };

  const handleContinue = () => {
    const selectedMode = modes.find((m) => m.id === selected);
    if (selectedMode?.disabled) return;
    if (selected === "design") {
      setShowTemplates(true);
    } else if (selected === "generate") {
      setShowGen(true);
    } else if (selected === "featured") {
      setShowFeatured(true);
    }
  };

  if (showTemplates)
    return <AddPanePanel nodeId={nodeId} first={true} ctx={ctx} isStoryFragment={true} />;
  else if (showGen) return <PageCreationGen nodeId={nodeId} ctx={ctx} />;
  else if (showFeatured) return <PageCreationSpecial nodeId={nodeId} ctx={ctx} />;

  return (
    <div className="p-0.5 shadow-inner">
      <div className="p-6 bg-white rounded-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 font-action mb-6">
          How would you like to create your page?
        </h2>

        <div className="w-full max-w-3xl">
          <RadioGroup value={selected} onChange={handleModeSelect}>
            <RadioGroup.Label className="sr-only">Page Creation Mode</RadioGroup.Label>
            <div className="space-y-4">
              {modes.map((mode) => (
                <RadioGroup.Option
                  key={mode.id}
                  value={mode.id}
                  disabled={mode.disabled}
                  className={({ active, checked }) =>
                    `${active && !mode.disabled ? "ring-2 ring-cyan-600 ring-offset-2" : ""}
                    ${checked ? "bg-cyan-700 text-white" : mode.disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white"}
                    relative flex cursor-pointer rounded-lg px-5 py-6 shadow-md focus:outline-none`
                  }
                >
                  {({ checked }) => (
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
                              className={`h-8 w-8 ${checked ? "text-white" : "text-cyan-700"}`}
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <div className="ml-4">
                          <RadioGroup.Label
                            as="p"
                            className={`font-bold ${
                              checked
                                ? "text-white"
                                : mode.disabled
                                  ? "text-gray-400"
                                  : "text-gray-900"
                            }`}
                          >
                            {mode.name}
                          </RadioGroup.Label>
                          <RadioGroup.Description
                            as="span"
                            className={`inline ${
                              checked
                                ? "text-cyan-100"
                                : mode.disabled
                                  ? "text-gray-400"
                                  : "text-gray-500"
                            }`}
                          >
                            {mode.description}
                            {mode.disabled && mode.disabledReason && (
                              <span className="block mt-1 text-amber-500 font-medium">
                                {mode.disabledReason}
                              </span>
                            )}
                          </RadioGroup.Description>
                        </div>
                      </div>
                      {checked && !mode.disabled && (
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
