/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Dispatch, type SetStateAction, useEffect, useState, useMemo, Fragment } from "react";
import { Listbox, Switch, Combobox, Transition } from "@headlessui/react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/20/solid";
import { PaneMode } from "./AddPanePanel";
import { NodesContext } from "@/store/nodes";
import { NodesSnapshotRenderer, type SnapshotData } from "@/utils/nodes/NodesSnapshotRenderer";
import { createEmptyStorykeep } from "@/utils/common/nodesHelper";
import { brandColours, preferredTheme } from "@/store/storykeep.ts";
import { templateCategories } from "@/utils/designs/templateMarkdownStyles";
import { themes } from "@/constants.ts";
import type { Theme } from "@/types";

interface AddPaneNewPanelProps {
  nodeId: string;
  first: boolean;
  setMode: Dispatch<SetStateAction<PaneMode>>;
  ctx?: NodesContext;
  isStoryFragment?: boolean;
  isContextPane?: boolean;
}

interface PreviewPane {
  ctx: NodesContext;
  snapshot?: SnapshotData;
  template: any;
  index: number;
}

interface TemplateCategory {
  id: string;
  title: string;
  getTemplates: (theme: Theme, brand: string, useOdd: boolean) => any[];
}

const ITEMS_PER_PAGE = 4;

const AddPaneNewPanel = ({
  nodeId,
  first,
  setMode,
  ctx,
  isStoryFragment = false,
  isContextPane = false,
}: AddPaneNewPanelProps) => {
  const brand = brandColours.get();
  const [previews, setPreviews] = useState<PreviewPane[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set([0]));
  const [selectedTheme, setSelectedTheme] = useState<Theme>(preferredTheme.get());
  const [useOddVariant, setUseOddVariant] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>(templateCategories[0]);

  const filteredTemplates = useMemo(() => {
    if (query === "") {
      return selectedCategory.getTemplates(selectedTheme, brand, useOddVariant);
    }

    const searchQuery = query.toLowerCase();
    const allTemplates = templateCategories[0].getTemplates(selectedTheme, brand, useOddVariant);

    return allTemplates.filter(
      (template) =>
        template.title?.toLowerCase().includes(searchQuery) ||
        template.slug?.toLowerCase().includes(searchQuery)
    );
  }, [selectedTheme, useOddVariant, query, selectedCategory]);

  useEffect(() => {
    const newPreviews = filteredTemplates.map((template, index: number) => {
      const ctx = new NodesContext();
      ctx.addNode(createEmptyStorykeep("tmp"));
      ctx.addTemplatePane("tmp", template);
      return { ctx, template, index };
    });
    setPreviews(newPreviews);
    setCurrentPage(0);
    setRenderedPages(new Set([0]));
  }, [filteredTemplates]);

  const totalPages = Math.ceil(previews.length / ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      setRenderedPages((prev) => new Set([...prev, newPage]));
    }
  };

  const visiblePreviews = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return previews.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [previews, currentPage]);

  const handleTemplateInsert = (template: any, nodeId: string, first: boolean) => {
    if (ctx) {
      const ownerId =
        isStoryFragment || isContextPane
          ? nodeId
          : ctx.getClosestNodeTypeFromId(nodeId, "StoryFragment");
      const newPaneId = ctx.addTemplatePane(ownerId, template, nodeId, first ? "before" : "after");
      if (newPaneId) ctx.notifyNode(`root`);
    }
  };

  return (
    <div className="p-0.5 shadow-inner">
      <div className="p-1.5 bg-white rounded-md flex gap-1 w-full group">
        <button
          onClick={() => setMode(PaneMode.DEFAULT)}
          className="w-fit px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors"
        >
          ← Go Back
        </button>

        <div className="flex flex-wrap gap-x-6 gap-y-2 items-center ml-4 py-2">
          <div className="flex-none px-2 py-2.5 text-sm rounded text-cyan-700 font-bold font-action shadow-sm">
            + Design New Pane
          </div>

          {/* Theme Select */}
          <div className="w-40">
            <Listbox value={selectedTheme} onChange={setSelectedTheme}>
              <div className="relative">
                <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-myorange focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                  <span className="block truncate capitalize">
                    {selectedTheme.replace(/-/g, " ")}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </span>
                </Listbox.Button>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options className="absolute z-50 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                    {themes.map((theme) => (
                      <Listbox.Option
                        key={theme}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active ? "bg-amber-100 text-amber-900" : "text-gray-900"
                          }`
                        }
                        value={theme}
                      >
                        {({ selected }) => (
                          <>
                            <span
                              className={`block truncate capitalize ${selected ? "font-bold" : "font-normal"}`}
                            >
                              {theme.replace(/-/g, " ")}
                            </span>
                            {selected && (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
          </div>

          {/* Odd Variant Toggle */}
          <Switch.Group as="div" className="flex items-center gap-2">
            <div className="relative">
              <Switch
                checked={useOddVariant}
                onChange={setUseOddVariant}
                className={`${
                  useOddVariant ? "bg-cyan-600" : "bg-gray-200"
                } my-2 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    useOddVariant ? "left-6" : "left-1"
                  } absolute top-1 inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-all duration-200`}
                />
              </Switch>
            </div>
            <Switch.Label className="text-sm text-gray-700">Use odd variant</Switch.Label>
          </Switch.Group>

          {/* Category Filter */}
          <div className="w-[250px]">
            <Combobox value={selectedCategory} onChange={setSelectedCategory}>
              <div className="relative">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                  <Combobox.Input
                    autoComplete="off"
                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                    onChange={(event) => setQuery(event.target.value)}
                    displayValue={(category: TemplateCategory) => category.title}
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
                >
                  <Combobox.Options className="absolute z-50 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                    {templateCategories.map((category) => (
                      <Combobox.Option
                        key={category.id}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active ? "bg-teal-600 text-white" : "text-gray-900"
                          }`
                        }
                        value={category}
                      >
                        {({ selected, active }) => (
                          <>
                            <span
                              className={`block truncate ${selected ? "font-bold" : "font-normal"}`}
                            >
                              {category.title}
                            </span>
                            {selected && (
                              <span
                                className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                  active ? "text-white" : "text-teal-600"
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
                </Transition>
              </div>
            </Combobox>
          </div>
        </div>
      </div>

      <h3 className="px-3.5 pt-4 pb-1.5 font-bold text-black text-xl font-action">
        Click on a design to use:
      </h3>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-2">
        {visiblePreviews.map((preview) => (
          <div
            key={preview.index}
            onClick={() => handleTemplateInsert(preview.template, nodeId, first)}
            className={`group bg-mywhite shadow-inner relative w-full rounded-sm cursor-pointer transition-all duration-200 ${
              preview.snapshot ? "hover:outline hover:outline-4 hover:outline-solid" : ""
            }`}
            style={{
              ...(!preview.snapshot ? { minHeight: "200px" } : {}),
            }}
          >
            {renderedPages.has(currentPage) && !preview.snapshot && (
              <NodesSnapshotRenderer
                ctx={preview.ctx}
                forceRegenerate={false}
                onComplete={(data) => {
                  setPreviews((prev) =>
                    prev.map((p) => (p.index === preview.index ? { ...p, snapshot: data } : p))
                  );
                }}
              />
            )}
            {preview.snapshot && (
              <div className="p-0.5">
                <img
                  src={preview.snapshot.imageData}
                  alt={`Template ${preview.index + 1}`}
                  className="w-full"
                />
              </div>
            )}
            <div className="rounded-t-md absolute bottom-0 left-0 right-0 bg-mydarkgrey group-hover:bg-myblack text-white px-2 py-1 text-sm">
              {preview.template.title}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center items-center gap-2 mt-4 mb-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <div className="flex gap-1">
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => handlePageChange(index)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                currentPage === index
                  ? "bg-cyan-700 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages - 1}
          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AddPaneNewPanel;
