import { RadioGroup } from "@ark-ui/react/radio-group";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";
import { hasAssemblyAIStore } from "@/store/storykeep.ts";

export type CopyMode = "design" | "ai" | "custom" | "blank";

interface AddPaneNewCopyModeProps {
  selected: CopyMode;
  onChange: (mode: CopyMode) => void;
}

export const AddPaneNewCopyMode = ({ selected, onChange }: AddPaneNewCopyModeProps) => {
  const hasAssemblyAI = hasAssemblyAIStore.get();

  const baseModesConfig = [
    { id: "design", name: "Quick start", description: "Use pre-designed copy templates" },
    { id: "custom", name: "Provide your own Copy", description: "Write your own markdown content" },
    { id: "blank", name: "Blank", description: "Start with a styled blank slate" },
  ];

  const aiModeConfig = {
    id: "ai",
    name: "Write with AI",
    description: "Let AI help write your content",
  };

  // Include "ai" mode only if hasAssemblyAI is true
  const modes = hasAssemblyAI
    ? [baseModesConfig[0], aiModeConfig, ...baseModesConfig.slice(1)]
    : baseModesConfig;

  // Custom styles for the radio group component
  const radioGroupStyles = `
    .radio-control[data-state="unchecked"] .radio-dot {
      background-color: #d1d5db; /* gray-300 */
    }
    .radio-control[data-state="checked"] .radio-dot {
      background-color: #0891b2; /* bg-cyan-600 */
    }
    .radio-control[data-state="checked"] {
      border-color: #0891b2; /* bg-cyan-600 */
    }
    .radio-item[data-state="checked"] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .radio-item:hover:not([data-state="checked"]) {
      background-color: #f3f4f6; /* bg-gray-100 */
    }
  `;

  return (
    <div className="w-full pr-4">
      <style>{radioGroupStyles}</style>
      <div className="max-w-4xl">
        <RadioGroup.Root
          defaultValue={selected}
          onValueChange={(details) => {
            if (details.value) {
              onChange(details.value as CopyMode);
            }
          }}
        >
          <RadioGroup.Label className="sr-only">Copy Mode</RadioGroup.Label>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {modes.map((mode) => (
              <RadioGroup.Item
                key={mode.id}
                value={mode.id}
                className="radio-item relative flex cursor-pointer rounded-lg px-5 py-4 shadow-md focus:outline-none"
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center">
                    <RadioGroup.ItemText>
                      <div className="text-sm">
                        <p className="font-bold">{mode.name}</p>
                        <span className="inline">{mode.description}</span>
                      </div>
                    </RadioGroup.ItemText>
                  </div>
                  <div className="shrink-0 hidden data-[state=checked]:block">
                    <CheckCircleIcon className="h-6 w-6" />
                  </div>
                </div>
                <RadioGroup.ItemControl className="hidden" />
                <RadioGroup.ItemHiddenInput />
              </RadioGroup.Item>
            ))}
          </div>
        </RadioGroup.Root>
      </div>
    </div>
  );
};
