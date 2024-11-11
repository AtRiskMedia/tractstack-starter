import { useState, useMemo, useRef } from "react";
import { useDropdownDirection } from "../../../hooks/useDropdownDirection";
import { Combobox } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import { getTailwindColorOptions } from "../../../assets/tailwindColors";
import { classNames } from "../../../utils/helpers";

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
          className="w-full rounded-md border-0 px-2.5 py-1.5 pr-10 text-myblack ring-1 ring-inset ring-mygreen placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-myorange xs:text-sm xs:leading-6"
          onChange={(event) => setQuery(event.target.value)}
          displayValue={(color: string) => color}
          placeholder="Select a Tailwind color"
          autoComplete="off"
        />
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
                "relative cursor-default select-none py-2 pl-10 pr-4",
                active ? "bg-myorange text-white" : "text-myblack"
              )
            }
          >
            {({ selected, active }) => (
              <>
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
