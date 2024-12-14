import { useRef } from "react";
import { Combobox, Listbox } from "@headlessui/react";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import { useDropdownDirection } from "../../../utils/storykeep/useDropdownDirection";
import { classNames } from "../../../utils/common/helpers";
import { tailwindClasses } from "../../../utils/tailwind/tailwindClasses";

const styleFilterOptions = [
  { value: "popular", label: "Popular Styles" },
  { value: "advanced", label: "+ Advanced" },
  { value: "effects", label: "+ Effects" },
] as const;

export type StyleFilter = (typeof styleFilterOptions)[number]["value"];

interface AddClassProps {
  styleFilter: StyleFilter;
  setStyleFilter: (filter: StyleFilter) => void;
  selectedClass: string;
  setSelectedClass: (className: string) => void;
  setQuery: (query: string) => void;
  filteredClasses: [string, { title: string }][];
  handleAddStyleIntercept: () => void;
}

const AddClass = ({
  styleFilter,
  setStyleFilter,
  selectedClass,
  setSelectedClass,
  setQuery,
  filteredClasses,
  handleAddStyleIntercept,
}: AddClassProps): JSX.Element => {
  const addStyleListboxRef = useRef<HTMLButtonElement>(null);
  const { openAbove: addStyleOpenAbove, maxHeight: addStyleMaxHeight } =
    useDropdownDirection(addStyleListboxRef);

  return (
    <div className="mt-6">
      <div className="bg-white shadow-inner rounded">
        <div className="px-6 py-4">
          <h4 className="text-lg">Add Styles</h4>
          <div className="my-4">
            <Listbox value={styleFilter} onChange={setStyleFilter}>
              <div className="relative mt-1">
                <Listbox.Button
                  ref={addStyleListboxRef}
                  className="relative w-full cursor-default rounded-md border border-mydarkgrey bg-white py-2 pl-3 pr-10 text-left text-black shadow-sm focus:outline-none focus:ring-1 focus:ring-myorange focus:border-myorange xs:text-sm"
                >
                  <span className="block truncate">
                    {styleFilterOptions.find((option) => option.value === styleFilter)?.label}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
                  </span>
                </Listbox.Button>
                <Listbox.Options
                  className={classNames(
                    "absolute z-10 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none xs:text-sm",
                    addStyleOpenAbove ? "bottom-full mb-1" : "top-full mt-1"
                  )}
                  style={{ maxHeight: `${addStyleMaxHeight}px` }}
                >
                  {styleFilterOptions.map((option) => (
                    <Listbox.Option
                      key={option.value}
                      value={option.value}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active ? "bg-myorange text-white" : "text-black"
                        }`
                      }
                    >
                      {({ selected, active }) => (
                        <>
                          <span
                            className={`block truncate ${selected ? "font-bold" : "font-normal"}`}
                          >
                            {option.label}
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
              </div>
            </Listbox>
          </div>

          <div className="relative">
            <Combobox value={selectedClass} onChange={setSelectedClass}>
              <div className="relative mt-1">
                <Combobox.Input
                  className="w-full border border-mydarkgrey rounded-md py-2 pl-3 pr-10 text-xl leading-5 text-black focus:ring-1 focus:ring-myorange focus:border-myorange"
                  displayValue={(className: string) => tailwindClasses[className]?.title || ""}
                  onChange={(event) => setQuery(event.target.value)}
                  autoComplete="off"
                  placeholder="Select a style to add"
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
                </Combobox.Button>
              </div>
              <Combobox.Options
                className={classNames(
                  "absolute z-10 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none xs:text-sm",
                  addStyleOpenAbove ? "bottom-full mb-1" : "top-full mt-1"
                )}
                style={{ maxHeight: `${addStyleMaxHeight}px` }}
              >
                {filteredClasses.map(([className, classInfo]) => (
                  <Combobox.Option
                    key={className}
                    value={className}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? "bg-myorange text-white" : "text-black"
                      }`
                    }
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`block truncate ${selected ? "font-bold" : "font-normal"}`}
                        >
                          {classInfo.title}
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
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            </Combobox>
          </div>

          <button
            onClick={handleAddStyleIntercept}
            className="mt-4 w-full py-2 bg-myorange text-white rounded-md hover:bg-myorange/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-myorange"
          >
            Add Style
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddClass;
