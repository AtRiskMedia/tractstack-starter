import { RadioGroup } from "@ark-ui/react/radio-group";
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
      border-color: #0891b2; /* bg-cyan-600 */
    }
  `;

  return (
    <div className="space-y-4">
      <style>{radioGroupStyles}</style>
      <RadioGroup.Root value={value} onValueChange={(details) => onChange(details.value || "")}>
        <div className="space-y-2">
          {modes.map((mode) => (
            <RadioGroup.Item
              key={mode.id}
              value={mode.id}
              className="radio-item relative flex cursor-pointer rounded-lg px-5 py-4 focus:outline-none border hover:bg-mylightgrey/10"
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center">
                  <RadioGroup.ItemControl className="radio-control h-4 w-4 rounded-full border border-gray-300 mr-2 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full radio-dot" />
                  </RadioGroup.ItemControl>
                  <RadioGroup.ItemText>
                    <div className="text-sm">
                      <p className="font-bold text-mydarkgrey">{mode.title}</p>
                      <span className="inline text-mydarkgrey/90">{mode.description}</span>
                    </div>
                  </RadioGroup.ItemText>
                </div>
                {/* Show check icon for selected item */}
                <div className="shrink-0 text-myorange radio-check hidden data-[state=checked]:block">
                  <CheckCircleIcon className="h-6 w-6" />
                </div>
              </div>
              <RadioGroup.ItemHiddenInput />
            </RadioGroup.Item>
          ))}
        </div>
      </RadioGroup.Root>
    </div>
  );
}
