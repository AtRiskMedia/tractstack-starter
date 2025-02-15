import { RadioGroup } from "@headlessui/react";
import CheckCircleIcon from "@heroicons/react/20/solid/CheckCircleIcon";

export type CopyMode = "design" | "ai" | "custom" | "blank";

interface AddPaneNewCopyModeProps {
  selected: CopyMode;
  onChange: (mode: CopyMode) => void;
}

export const AddPaneNewCopyMode = ({ selected, onChange }: AddPaneNewCopyModeProps) => {
  const modes = [
    { id: "design", name: "Design Copy", description: "Use pre-designed copy templates" },
    //{ id: "ai", name: "Write with AI", description: "Let AI help write your content" },
    { id: "custom", name: "Provide your own Copy", description: "Write your own markdown content" },
    { id: "blank", name: "Blank", description: "Start with a styled blank slate" },
  ];

  return (
    <div className="w-full pr-4">
      <div className="max-w-4xl">
        <RadioGroup value={selected} onChange={onChange}>
          <RadioGroup.Label className="sr-only">Copy Mode</RadioGroup.Label>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {modes.map((mode) => (
              <RadioGroup.Option
                key={mode.id}
                value={mode.id}
                className={({ active, checked }) =>
                  `${active ? "ring-2 ring-cyan-700 ring-offset-2" : ""}
                  ${checked ? "bg-cyan-700" : "bg-white"}
                  relative flex cursor-pointer rounded-lg px-5 py-4 shadow-md focus:outline-none`
                }
              >
                {({ checked }) => (
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-sm">
                        <RadioGroup.Label
                          as="p"
                          className={`font-medium ${checked ? "text-white" : "text-gray-900"}`}
                        >
                          {mode.name}
                        </RadioGroup.Label>
                        <RadioGroup.Description
                          as="span"
                          className={`inline ${checked ? "text-gray-100" : "text-gray-600"}`}
                        >
                          {mode.description}
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
    </div>
  );
};
