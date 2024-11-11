import { Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import type { Theme } from "../../../types";

interface ThemeSelectorProps {
  value: Theme;
  onChange: (theme: Theme) => void;
  disabled?: boolean;
}

const themes: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "light-bw", label: "Light B&W" },
  { value: "light-bold", label: "Light Bold" },
  { value: "dark", label: "Dark" },
  { value: "dark-bw", label: "Dark B&W" },
  { value: "dark-bold", label: "Dark Bold" },
];

const ThemeSelector = ({ value, onChange, disabled = false }: ThemeSelectorProps) => {
  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className="relative w-48">
        <Listbox.Button className="bg-myorange/20 text-black rounded-lg p-2 py-1 hover:bg-myorange/50 transition-colors h-full flex items-center justify-between">
          <span className="block truncate mr-2">
            Theme: {themes.find((theme) => theme.value === value)?.label || "Select theme"}
          </span>
          <ChevronUpDownIcon className="h-5 w-5" aria-hidden="true" />
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {themes.map((theme, themeIdx) => (
              <Listbox.Option
                key={themeIdx}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? "bg-myorange text-white" : "text-mydarkgrey"
                  }`
                }
                value={theme.value}
              >
                {({ selected, active }) => (
                  <>
                    <span className={`block truncate ${selected ? "font-bold" : "font-normal"}`}>
                      {theme.label}
                    </span>
                    {selected ? (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          active ? "text-white" : "text-myorange"
                        }`}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
};

export default ThemeSelector;
