import { useRef, useState, useEffect, useCallback } from "react";
import { Combobox } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/20/solid/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import DevicePhoneMobileIcon from "@heroicons/react/24/outline/DevicePhoneMobileIcon";
import DeviceTabletIcon from "@heroicons/react/24/outline/DeviceTabletIcon";
import ComputerDesktopIcon from "@heroicons/react/24/outline/ComputerDesktopIcon";
import { classNames } from "../../../../utils/common/helpers";
import { tailwindToHex, colorValues } from "../../../../utils/tailwind/tailwindColors";
import type { ChangeEvent } from "react";
import type { Config } from "../../../../types";

interface ViewportComboBoxProps {
  value: string;
  onFinalChange: (
    value: string,
    viewport: "mobile" | "tablet" | "desktop",
    isNegative?: boolean
  ) => void;
  values: string[];
  viewport: "mobile" | "tablet" | "desktop";
  allowNegative?: boolean;
  isNegative?: boolean;
  isInferred?: boolean;
  config: Config;
}

const ViewportComboBox = ({
  value,
  onFinalChange,
  values,
  viewport,
  allowNegative = false,
  isNegative = false,
  isInferred = false,
  config,
}: ViewportComboBoxProps) => {
  const [internalValue, setInternalValue] = useState(value);
  const [query, setQuery] = useState("");
  const [isNowNegative, setIsNowNegative] = useState(isNegative);
  const [filteredValues, setFilteredValues] = useState(values);
  const inputRef = useRef<HTMLInputElement>(null);

  const Icon =
    viewport === "mobile"
      ? DevicePhoneMobileIcon
      : viewport === "tablet"
        ? DeviceTabletIcon
        : ComputerDesktopIcon;

  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
      setQuery("");
    }
    if (isNegative !== isNowNegative) {
      setIsNowNegative(isNegative);
    }
  }, [value, isNegative]);

  // Filter values based on query
  useEffect(() => {
    const filtered =
      query === ""
        ? values
        : values.filter((item) => item.toLowerCase().includes(query.toLowerCase()));
    setFilteredValues(filtered);
  }, [query, values]);

  const handleNegativeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setIsNowNegative(event.target.checked);
      onFinalChange(internalValue, viewport, event.target.checked);
    },
    [internalValue, onFinalChange, viewport]
  );

  const handleChange = useCallback((newValue: string) => {
    setInternalValue(newValue);
    setQuery(newValue);
  }, []);

  const handleSelect = useCallback(
    (selectedValue: string) => {
      setInternalValue(selectedValue);
      setQuery("");
      onFinalChange(selectedValue, viewport, isNowNegative);
    },
    [onFinalChange, viewport, isNowNegative]
  );

  const handleBlur = useCallback(() => {
    if (values.includes(internalValue)) {
      onFinalChange(internalValue, viewport, isNowNegative);
    } else {
      setInternalValue(value);
    }
    setQuery("");
  }, [internalValue, value, values, onFinalChange, viewport, isNowNegative]);

  const isColorValue = colorValues.includes(internalValue);

  return (
    <div className="flex flex-nowrap items-center relative" title={`Value on ${viewport} Screens`}>
      <Icon className="h-8 w-8 mr-2" aria-hidden="true" />
      <div className="relative w-full">
        <div className="flex items-center">
          <div className="relative flex-grow">
            <Combobox value={internalValue} onChange={handleSelect}>
              {() => (
                <>
                  <div className="relative">
                    <div className="relative flex items-center">
                      {isColorValue && (
                        <div
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 border border-black/10 rounded shadow-sm"
                          style={{
                            backgroundColor: tailwindToHex(
                              internalValue,
                              config?.init?.BRAND_COLOURS || null
                            ),
                          }}
                        />
                      )}
                      <Combobox.Input
                        ref={inputRef}
                        className={classNames(
                          "w-full border border-mydarkgrey rounded-md py-2 text-xl leading-5 focus:ring-1 focus:ring-myorange focus:border-myorange",
                          isInferred ? "text-black/20" : "text-black",
                          isColorValue ? "pl-12" : "pl-3",
                          "pr-16"
                        )}
                        onChange={(event) => handleChange(event.target.value)}
                        onBlur={handleBlur}
                        displayValue={(v: string) => v}
                        autoComplete="off"
                      />
                    </div>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                      <Combobox.Button className="flex items-center pl-2">
                        <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
                      </Combobox.Button>
                    </div>
                  </div>
                  <Combobox.Options className="absolute z-50 w-full overflow-auto rounded-md bg-white py-1 text-xl shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-32 mt-1">
                    {!filteredValues?.length && query !== "" ? (
                      <div className="relative cursor-default select-none py-2 px-4 text-mydarkgrey">
                        Nothing found.
                      </div>
                    ) : (
                      filteredValues?.map((item) => (
                        <Combobox.Option
                          key={item}
                          value={item}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 ${
                              colorValues.includes(item) ? `pl-12` : `pl-6`
                            } pr-9 ${active ? "bg-myorange text-white" : "text-black"}`
                          }
                        >
                          {({ selected, active }) => (
                            <>
                              {colorValues.includes(item) && (
                                <div
                                  className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 border border-black/10 rounded shadow-sm"
                                  style={{
                                    backgroundColor: tailwindToHex(
                                      item,
                                      config?.init?.BRAND_COLOURS || null
                                    ),
                                  }}
                                />
                              )}
                              <span
                                className={`block truncate ${selected ? "font-bold" : "font-normal"}`}
                              >
                                {item}
                              </span>
                              {selected && (
                                <span
                                  className={`absolute inset-y-0 right-0 flex items-center pr-4 ${
                                    active ? "text-white" : "text-myorange"
                                  }`}
                                >
                                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                </span>
                              )}
                            </>
                          )}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </>
              )}
            </Combobox>
          </div>
          {allowNegative && (
            <div className="ml-2 flex items-center">
              <input
                type="checkbox"
                id={`negative-${viewport}`}
                checked={isNowNegative}
                onChange={handleNegativeChange}
                className="h-4 w-4 text-myorange focus:ring-myorange border-mydarkgrey rounded"
              />
              <label htmlFor={`negative-${viewport}`} className="ml-2 block text-sm text-black">
                Negative
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewportComboBox;
