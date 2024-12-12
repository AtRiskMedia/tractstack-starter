import { useState, useMemo, useRef } from "react";
import { useDropdownDirection } from "../../../utils/storykeep/useDropdownDirection";
import { Combobox } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import {
  getTailwindColorOptions,
  tailwindToHex,
  getBrandColor,
} from "../../../utils/tailwind/tailwindColors";
import { classNames } from "../../../utils/common/helpers";

interface TailwindColorComboboxProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const TailwindColorCombobox = ({ selectedColor, onColorChange }: TailwindColorComboboxProps) => {
  const [query, setQuery] = useState("");
  const tailwindColorOptions = useMemo(() => getTailwindColorOptions(), []);
  const filteredColors = useMemo(
    () =>
      query === ""
        ? tailwindColorOptions
        : tailwindColorOptions.filter((color) => color.toLowerCase().includes(query.toLowerCase())),
    [tailwindColorOptions, query]
  );
  const comboboxRef = useRef<HTMLDivElement>(null);
  const { openAbove, maxHeight } = useDropdownDirection(comboboxRef);

  const getColorValue = (color: string) => {
    if (color.startsWith("brand-")) {
      const brandColor = getBrandColor(`var(--${color})`);
      return brandColor ? `#${brandColor}` : tailwindToHex(`bg-${color}`);
    }
    return tailwindToHex(`bg-${color}`);
  };

  return (
    <Combobox
      as="div"
      value={selectedColor}
      onChange={onColorChange}
      className="relative mt-1 max-w-64"
      ref={comboboxRef}
    >
      <div className="relative">
        <Combobox.Input
          className="w-full rounded-md border-0 px-2.5 py-1.5 pl-12 pr-10 text-myblack ring-1 ring-inset ring-mygreen placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-myorange xs:text-sm xs:leading-6"
          onChange={(event) => setQuery(event.target.value)}
          displayValue={(color: string) => color}
          placeholder="Select a Tailwind color"
          autoComplete="off"
        />
        {selectedColor && !query && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 border border-black/10 rounded shadow-sm"
            style={{ backgroundColor: tailwindToHex(`bg-${selectedColor}`) }}
          />
        )}
        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronUpDownIcon className="h-5 w-5 text-myblue" aria-hidden="true" />
        </Combobox.Button>
      </div>
      <Combobox.Options
        className={`absolute z-10 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none xs:text-sm ${
          openAbove ? "bottom-full mb-1" : "top-full mt-1"
        }`}
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {filteredColors.map((color) => (
          <Combobox.Option
            key={color}
            value={color}
            className={({ active }) =>
              classNames(
                "relative cursor-default select-none py-2 pl-12 pr-4",
                active ? "bg-myorange text-white" : "text-myblack"
              )
            }
          >
            {({ selected, active }) => (
              <>
                <div
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 border border-black/10 rounded shadow-sm"
                  style={{ backgroundColor: getColorValue(color) }}
                />
                <span
                  className={classNames("block truncate", selected ? "font-bold" : "font-normal")}
                >
                  {color}
                </span>
                {selected && (
                  <span
                    className={classNames(
                      "absolute inset-y-0 left-0 flex items-center pl-3",
                      active ? "text-white" : "text-myorange"
                    )}
                  >
                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
              </>
            )}
          </Combobox.Option>
        ))}
      </Combobox.Options>
    </Combobox>
  );
};

export default TailwindColorCombobox;
