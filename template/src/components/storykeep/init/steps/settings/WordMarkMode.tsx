import { RadioGroup } from "@headlessui/react";
import CheckCircleIcon from "@heroicons/react/24/outline/CheckCircleIcon";

interface WordMarkModeProps {
  value: string;
  onChange: (value: string) => void;
}

const modes = [
  {
    id: "default",
    title: "Logo & Wordmark",
    description: "Display both logo and wordmark",
  },
  {
    id: "logo",
    title: "Logo Only",
    description: "Display only the logo",
  },
  {
    id: "wordmark",
    title: "Wordmark Only",
    description: "Display only the wordmark",
  },
];

export default function WordMarkMode({ value, onChange }: WordMarkModeProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-mydarkgrey">Header Display Mode</h3>
      <RadioGroup value={value} onChange={onChange}>
        <div className="space-y-2">
          {modes.map((mode) => (
            <RadioGroup.Option
              key={mode.id}
              value={mode.id}
              className={({ checked }) =>
                `relative flex cursor-pointer rounded-lg px-5 py-4 focus:outline-none ${
                  checked
                    ? "bg-myorange/10 ring-2 ring-myorange"
                    : "bg-white hover:bg-mylightgrey/10"
                }`
              }
            >
              {({ checked }) => (
                <>
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-sm">
                        <RadioGroup.Label
                          as="p"
                          className={`font-medium ${checked ? "text-myorange" : "text-mydarkgrey"}`}
                        >
                          {mode.title}
                        </RadioGroup.Label>
                        <RadioGroup.Description
                          as="span"
                          className={`inline ${
                            checked ? "text-myorange/90" : "text-mydarkgrey/90"
                          }`}
                        >
                          {mode.description}
                        </RadioGroup.Description>
                      </div>
                    </div>
                    {checked && (
                      <div className="shrink-0 text-myorange">
                        <CheckCircleIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                </>
              )}
            </RadioGroup.Option>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}
