import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Combobox } from "@ark-ui/react";
import { createListCollection } from "@ark-ui/react/collection";
import ChevronUpDownIcon from "@heroicons/react/20/solid/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import DevicePhoneMobileIcon from "@heroicons/react/24/outline/DevicePhoneMobileIcon";
import DeviceTabletIcon from "@heroicons/react/24/outline/DeviceTabletIcon";
import ComputerDesktopIcon from "@heroicons/react/24/outline/ComputerDesktopIcon";
import { classNames } from "@/utils/common/helpers";
import { tailwindToHex, colorValues } from "@/utils/tailwind/tailwindColors";
import type { ChangeEvent } from "react";
import type { Config } from "@/types";

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

  // Create collection for combobox
  const collection = useMemo(() => {
    const filteredValues =
      query === ""
        ? values
        : values.filter((item) => item.toLowerCase().includes(query.toLowerCase()));

    return createListCollection({
      items: filteredValues,
      itemToValue: (item) => item,
      itemToString: (item) => item,
    });
  }, [values, query]);

  const handleNegativeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setIsNowNegative(event.target.checked);
      onFinalChange(internalValue, viewport, event.target.checked);
    },
    [internalValue, onFinalChange, viewport]
  );

  const handleInputChange = useCallback((details: Combobox.InputValueChangeDetails) => {
    setQuery(details.inputValue);
  }, []);

  const handleValueChange = useCallback(
    (details: { value: string[] }) => {
      const selectedValue = details.value[0] || "";
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

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .viewport-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .viewport-item[data-highlighted] .viewport-indicator {
      color: white;
    }
    .viewport-item[data-state="checked"] .viewport-indicator {
      display: flex;
    }
    .viewport-item .viewport-indicator {
      display: none;
    }
    .viewport-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div
      className="flex flex-nowrap items-center relative max-w-md"
      title={`Value on ${viewport} Screens`}
    >
      <style>{comboboxItemStyles}</style>
      <Icon className="h-8 w-8 mr-2" aria-hidden="true" />
      <div className="relative w-full">
        <div className="flex items-center">
          <div className="relative flex-grow">
            <Combobox.Root
              collection={collection}
              value={[internalValue]}
              onValueChange={handleValueChange}
              onInputValueChange={handleInputChange}
              loopFocus={true}
              openOnKeyPress={true}
              composite={true}
            >
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
                      "w-full border border-mydarkgrey rounded-md py-2 text-xl leading-5 focus:ring-1 focus:ring-cyan-600 focus:border-cyan-600",
                      isInferred ? "text-black/20" : "text-black",
                      isColorValue ? "pl-12" : "pl-3",
                      "pr-16"
                    )}
                    onBlur={handleBlur}
                    autoComplete="off"
                  />
                  <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2 pl-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
                  </Combobox.Trigger>
                </div>
              </div>
              <Combobox.Content className="absolute z-50 w-full overflow-auto rounded-md bg-white py-1 text-xl shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-32 mt-1">
                {collection.items.length === 0 ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-mydarkgrey">
                    Nothing found.
                  </div>
                ) : (
                  collection.items.map((item) => (
                    <Combobox.Item
                      key={item}
                      item={item}
                      className="viewport-item relative cursor-default select-none py-2"
                    >
                      <div className="flex items-center">
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
                          className={`block truncate ${colorValues.includes(item) ? "pl-12" : "pl-6"} pr-9`}
                        >
                          {item}
                        </span>
                        <span className="viewport-indicator absolute inset-y-0 right-0 flex items-center pr-4 text-cyan-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      </div>
                    </Combobox.Item>
                  ))
                )}
              </Combobox.Content>
            </Combobox.Root>
          </div>
          {allowNegative && (
            <div className="ml-2 flex items-center">
              <input
                type="checkbox"
                id={`negative-${viewport}`}
                checked={isNowNegative}
                onChange={handleNegativeChange}
                className="h-4 w-4 text-cyan-600 focus:ring-cyan-600 border-mydarkgrey rounded"
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
