import { useState, useEffect, Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/20/solid";
import { themes } from "@/constants";
import { NodesSnapshotRenderer } from "@/utils/nodes/NodesSnapshotRenderer";
import { NodesContext } from "@/store/nodes";
import { createEmptyStorykeep } from "@/utils/common/nodesHelper";
import { brandColours, preferredTheme } from "@/store/storykeep.ts";
import type { Theme, PageDesign, StoryFragmentNode } from "@/types";
import type { SnapshotData } from "@/utils/nodes/NodesSnapshotRenderer";
import { getTemplateVisualBreakPane } from "@/utils/TemplatePanes";
import { getJustCopyDesign, getIntroDesign } from "@/utils/designs/templateMarkdownStyles";
import {
  parsePageMarkdown,
  createPagePanes,
  validatePageMarkdown,
} from "@/utils/designs/processMarkdown";

function getPageDesigns(brand: string, theme: Theme): PageDesign[] {
  return [
    {
      id: "min-default",
      title: "Default, Minimal",
      introDesign: () => getIntroDesign(theme, brand, false, true, `default`),
      contentDesign: (useOdd: boolean) => getJustCopyDesign(theme, brand, useOdd, false, `default`),
    },
    {
      id: "min-default-pretty",
      title: "Default, Pretty",
      introDesign: () => getIntroDesign(theme, brand, false, true, `default`),
      contentDesign: (useOdd: boolean) => getJustCopyDesign(theme, brand, useOdd, false, `default`),
      visualBreaks: {
        odd: () => getTemplateVisualBreakPane("cutwide2"),
        even: () => getTemplateVisualBreakPane("cutwide1"),
      },
    },
    {
      id: "min-onecol",
      title: "One-Column, Minimal",
      introDesign: () => getIntroDesign(theme, brand, false, true, `onecol`),
      contentDesign: (useOdd: boolean) => getJustCopyDesign(theme, brand, useOdd, false, `onecol`),
    },
    {
      id: "min-onecol-pretty",
      title: "One-Column, Pretty",
      introDesign: () => getIntroDesign(theme, brand, false, true, `onecol`),
      contentDesign: (useOdd: boolean) => getJustCopyDesign(theme, brand, useOdd, false, `onecol`),
      visualBreaks: {
        odd: () => getTemplateVisualBreakPane("cutwide2"),
        even: () => getTemplateVisualBreakPane("cutwide1"),
      },
    },
    {
      id: "min-centered",
      title: "Centered, Minimal",
      introDesign: () => getIntroDesign(theme, brand, false, true, `center`),
      contentDesign: (useOdd: boolean) => getJustCopyDesign(theme, brand, useOdd, false, `center`),
    },
    {
      id: "min-centered-pretty",
      title: "Centered, Pretty",
      introDesign: () => getIntroDesign(theme, brand, false, true, `center`),
      contentDesign: (useOdd: boolean) => getJustCopyDesign(theme, brand, useOdd, false, `center`),
      visualBreaks: {
        odd: () => getTemplateVisualBreakPane("cutwide2"),
        even: () => getTemplateVisualBreakPane("cutwide1"),
      },
    },
  ];
}

interface PreviewPane {
  ctx: NodesContext;
  snapshot?: SnapshotData;
  design: PageDesign;
  index: number;
}

interface PageCreationPreviewProps {
  markdownContent: string;
  onComplete: (previewCtx: NodesContext, markdownContent: string, design: PageDesign) => void;
  onBack: () => void;
}

export const PageCreationPreview = ({
  markdownContent,
  onComplete,
  onBack,
}: PageCreationPreviewProps) => {
  const [selectedTheme, setSelectedTheme] = useState<Theme>(preferredTheme.get());
  const [selectedDesignIndex, setSelectedDesignIndex] = useState(0);
  const [preview, setPreview] = useState<PreviewPane | null>(null);
  const [error, setError] = useState<string | null>(null);

  const brand = brandColours.get();
  const pageDesigns = getPageDesigns(brand, selectedTheme);

  useEffect(() => {
    if (!markdownContent) return;

    try {
      if (!validatePageMarkdown(markdownContent)) {
        setError("Invalid page structure");
        return;
      }

      const previewCtx = new NodesContext();
      previewCtx.addNode(createEmptyStorykeep("tmp"));

      const processedPage = parsePageMarkdown(markdownContent);
      const design = pageDesigns[selectedDesignIndex];
      const paneIds = createPagePanes(processedPage, design, previewCtx);

      const pageNode = previewCtx.allNodes.get().get("tmp") as StoryFragmentNode;
      if (pageNode) {
        pageNode.paneIds = paneIds;
      }

      setPreview({
        ctx: previewCtx,
        design: design,
        index: selectedDesignIndex,
      });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate preview");
    }
  }, [markdownContent, selectedTheme, selectedDesignIndex]);

  return (
    <div className="p-6 bg-white rounded-md">
      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-6">
          {/* Theme Selector */}
          <div className="w-48">
            <Listbox value={selectedTheme} onChange={setSelectedTheme}>
              <div className="relative mt-1">
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
                  <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
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
                              className={`block truncate capitalize ${
                                selected ? "font-bold" : "font-normal"
                              }`}
                            >
                              {theme.replace(/-/g, " ")}
                            </span>
                            {selected ? (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
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
          </div>

          {/* Layout Selector */}
          <div className="w-64">
            <Listbox value={selectedDesignIndex} onChange={setSelectedDesignIndex}>
              <div className="relative mt-1">
                <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-myorange focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                  <span className="block truncate">{pageDesigns[selectedDesignIndex].title}</span>
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
                  <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                    {pageDesigns.map((design, idx) => (
                      <Listbox.Option
                        key={design.id}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active ? "bg-amber-100 text-amber-900" : "text-gray-900"
                          }`
                        }
                        value={idx}
                      >
                        {({ selected }) => (
                          <>
                            <span
                              className={`block truncate ${selected ? "font-bold" : "font-normal"}`}
                            >
                              {design.title}
                            </span>
                            {selected ? (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
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
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {error ? (
              <span className="text-red-500">{error}</span>
            ) : (
              "Please select a theme and design template"
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onBack}
              className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={() =>
                preview?.ctx &&
                onComplete(preview.ctx, markdownContent, pageDesigns[selectedDesignIndex])
              }
              className="px-4 py-2 text-sm font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-700"
              disabled={!preview?.ctx || !!error}
            >
              Apply Design
            </button>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div className="bg-gray-100 rounded-lg p-4">
        {!preview ? (
          <div className="flex flex-col items-center justify-center h-96 bg-white shadow-lg rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mb-4"></div>
            <p className="text-sm text-gray-500">Generating preview...</p>
          </div>
        ) : (
          <div className="bg-white shadow-lg">
            {preview.snapshot ? (
              <div className="p-0.5">
                <img
                  src={preview.snapshot.imageData}
                  alt={`Design ${preview.index + 1}`}
                  className="w-full"
                />
              </div>
            ) : (
              <div className="h-96">
                <NodesSnapshotRenderer
                  ctx={preview.ctx}
                  forceRegenerate={false}
                  onComplete={(data) => {
                    setPreview((prev) => (prev ? { ...prev, snapshot: data } : null));
                  }}
                  outputWidth={800}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageCreationPreview;
