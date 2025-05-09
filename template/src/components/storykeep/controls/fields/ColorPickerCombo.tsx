import { useState, useCallback } from "react";
import { Combobox } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import {
  hexToTailwind,
  tailwindToHex,
  getTailwindColorOptions,
} from "@/utils/tailwind/tailwindColors.ts";
import { findClosestTailwindColor } from "./ColorPicker";
import { getComputedColor, debounce } from "@/utils/common/helpers.ts";
import type { Config } from "@/types.ts";

export interface ColorPickerProps {
  title: string;
  config: Config;
  defaultColor: string;
  onColorChange: (color: string) => void;
  skipTailwind?: boolean;
  allowNull?: boolean;
}

const ColorPickerCombo = ({
  title,
  defaultColor,
  onColorChange,
  config,
  skipTailwind = false,
  allowNull = false,
}: ColorPickerProps) => {
  const [hexColor, setHexColor] = useState(defaultColor);
  const [selectedTailwindColor, setSelectedTailwindColor] = useState(() => {
    return skipTailwind ? "" : hexToTailwind(defaultColor, config?.init?.BRAND_COLOURS) || "";
  });
  const [query, setQuery] = useState("");

  const tailwindColorOptions = getTailwindColorOptions();
  const filteredColors =
    query === ""
      ? tailwindColorOptions
      : tailwindColorOptions.filter((color) => color.toLowerCase().includes(query.toLowerCase()));

  // Handle hex color picker changes
  const handleHexColorChange = useCallback(
    debounce((newHexColor: string) => {
      const computedColor = getComputedColor(newHexColor);
      setHexColor(computedColor);

      if (!skipTailwind) {
        const exactTailwindColor = hexToTailwind(computedColor, config?.init?.BRAND_COLOURS);
        if (exactTailwindColor) {
          setSelectedTailwindColor(exactTailwindColor);
          setQuery(exactTailwindColor);
        } else {
          const closestColor = findClosestTailwindColor(computedColor);
          if (closestColor) {
            const tailwindClass = `${closestColor.name}-${closestColor.shade}`;
            setSelectedTailwindColor(tailwindClass);
            setQuery(tailwindClass);
          } else {
            setSelectedTailwindColor("");
            setQuery("");
          }
        }
      }

      onColorChange(computedColor);
    }, 16),
    [onColorChange, skipTailwind]
  );

  // Handle Tailwind color selection
  const handleTailwindColorChange = useCallback(
    (newTailwindColor: string) => {
      if (skipTailwind) return;

      setSelectedTailwindColor(newTailwindColor);
      setQuery(newTailwindColor);

      const newHexColor = getComputedColor(
        tailwindToHex(`bg-${newTailwindColor}`, config?.init?.BRAND_COLOURS || null)
      );
      setHexColor(newHexColor);
      onColorChange(newHexColor);
    },
    [onColorChange, config, skipTailwind]
  );

  // New function to handle color removal
  const handleRemoveColor = useCallback(() => {
    setHexColor("");
    setSelectedTailwindColor("");
    setQuery("");
    onColorChange("");
  }, [onColorChange]);

  return (
    <div>
      {title && <span className="block text-sm text-mydarkgrey py-2">{title}</span>}
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={hexColor || `#ffffff`}
          onChange={(e) => handleHexColorChange(e.target.value)}
          className="h-9 w-12 rounded border-mydarkgrey"
        />
        {allowNull && (
          <button
            onClick={handleRemoveColor}
            className="h-9 w-9 flex items-center justify-center rounded border-mydarkgrey"
          >
            <XMarkIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
          </button>
        )}
        {!skipTailwind && (
          <div className="flex-grow">
            <Combobox value={selectedTailwindColor} onChange={handleTailwindColorChange}>
              <div className="relative max-w-48">
                <Combobox.Input
                  className="w-full border-mydarkgrey rounded-md py-2 pl-3 pr-10 shadow-sm focus:border-myblue focus:ring-myblue xs:text-sm"
                  displayValue={(color: string) => color}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search Tailwind colors..."
                  autoComplete="off"
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
                </Combobox.Button>
                <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none xs:text-sm">
                  {filteredColors.map((color) => (
                    <Combobox.Option
                      key={color}
                      value={color}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-3 pr-4 ${
                          active ? "bg-myorange text-white" : "text-black"
                        }`
                      }
                    >
                      {({ selected, active }) => (
                        <>
                          <div className="flex items-center">
                            <div
                              className="w-6 h-6 rounded mr-3 flex-shrink-0"
                              style={{
                                backgroundColor: tailwindToHex(
                                  `bg-${color}`,
                                  config?.init?.BRAND_COLOURS || null
                                ),
                              }}
                            />
                            <span
                              className={`block truncate ${selected ? "font-bold" : "font-normal"}`}
                            >
                              {color}
                            </span>
                          </div>
                          {selected && (
                            <span
                              className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
                                active ? "text-white" : "text-myorange"
                              }`}
                            >
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          )}
                        </>
                      )}
                    </Combobox.Option>
                  ))}
                </Combobox.Options>
              </div>
            </Combobox>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorPickerCombo;
