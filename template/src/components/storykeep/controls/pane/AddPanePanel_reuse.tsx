import { type Dispatch, type SetStateAction, Fragment, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/20/solid";
import { contentMap } from "@/store/events";
import { PaneMode } from "./AddPanePanel";
import type { ContentMap } from "@/types";

interface AddPaneReUsePanelProps {
  nodeId: string;
  first: boolean;
  setMode: Dispatch<SetStateAction<PaneMode>>;
}

const AddPaneReUsePanel = ({ nodeId, first, setMode }: AddPaneReUsePanelProps) => {
  const [selected, setSelected] = useState<ContentMap | null>(null);
  const [query, setQuery] = useState("");

  const panes = contentMap.get().filter((item) => item.type === "Pane");

  const filteredPanes =
    query === ""
      ? panes
      : panes.filter(
          (pane) =>
            pane.title.toLowerCase().includes(query.toLowerCase()) ||
            pane.slug.toLowerCase().includes(query.toLowerCase())
        );

  return (
    <div className="p-0.5 shadow-inner">
      <div className="p-1.5 bg-white rounded-md w-full">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-[200px]">
            <button
              onClick={() => setMode(PaneMode.DEFAULT)}
              className="flex-none w-fit px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors"
            >
              ← Go Back
            </button>

            <div className="flex-none px-2 py-2.5 text-sm rounded text-cyan-700 font-bold font-action shadow-sm">
              Re-use Existing Pane
            </div>
          </div>

          <div className="flex-1 min-w-[300px]">
            <Combobox value={selected} onChange={setSelected}>
              <div className="relative">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-200 focus-within:border-cyan-500 transition-colors">
                  <Combobox.Input
                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                    displayValue={(pane: ContentMap) => pane?.title || ""}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search for a pane..."
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </Combobox.Button>
                </div>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                  afterLeave={() => setQuery("")}
                >
                  <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
                    {filteredPanes.length === 0 && query !== "" ? (
                      <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                        Nothing found.
                      </div>
                    ) : (
                      filteredPanes.map((pane) => (
                        <Combobox.Option
                          key={pane.id}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-10 pr-4 ${
                              active ? "bg-cyan-600 text-white" : "text-gray-900"
                            }`
                          }
                          value={pane}
                        >
                          {({ selected, active }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? "font-bold" : "font-normal"
                                }`}
                              >
                                {pane.title}
                              </span>
                              {selected ? (
                                <span
                                  className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                    active ? "text-white" : "text-cyan-600"
                                  }`}
                                >
                                  <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                </span>
                              ) : null}
                              <span
                                className={`block truncate text-sm ${
                                  active ? "text-cyan-100" : "text-gray-500"
                                }`}
                              >
                                {pane.slug}
                              </span>
                            </>
                          )}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </Transition>
              </div>
            </Combobox>
          </div>

          {selected && (
            <div className="flex flex-wrap gap-2 min-w-[200px]">
              <button
                onClick={() => {
                  console.log("Reusing pane:", selected.id, "at position:", nodeId, first);
                  // Add your reuse logic here
                }}
                className="px-3 py-2 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-700 focus:bg-cyan-700 transition-colors"
              >
                Use Selected Pane
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPaneReUsePanel;
