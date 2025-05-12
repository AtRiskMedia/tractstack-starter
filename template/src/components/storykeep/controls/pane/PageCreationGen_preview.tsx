import { useState, useEffect } from "react";
import { Select } from "@ark-ui/react/select";
import { Portal } from "@ark-ui/react/portal";
import { createListCollection } from "@ark-ui/react/collection";
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
  isApplying?: boolean;
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

  // Create collections for Ark UI Selects
  const themesCollection = createListCollection({
    items: themes,
    itemToValue: (item) => item,
    itemToString: (item) => item.replace(/-/g, " "),
  });

  const designsCollection = createListCollection({
    items: pageDesigns.map((design, index) => ({ design, index })),
    itemToValue: (item) => item.index.toString(),
    itemToString: (item) => item.design.title,
  });

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

      // Use async/await in a self-executing async function
      (async () => {
        const paneIds = await createPagePanes(processedPage, design, previewCtx, false);

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
      })();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate preview");
    }
  }, [markdownContent, selectedTheme, selectedDesignIndex]);

  // Handle theme selection with Ark UI
  const handleThemeChange = (details: { value: string[] }) => {
    const newTheme = details.value[0] as Theme;
    if (newTheme) {
      setSelectedTheme(newTheme);
    }
  };

  // Handle design selection with Ark UI
  const handleDesignChange = (details: { value: string[] }) => {
    const newDesignIndex = parseInt(details.value[0], 10);
    if (!isNaN(newDesignIndex)) {
      setSelectedDesignIndex(newDesignIndex);
    }
  };

  // CSS to properly style the select items with hover and selection
  const customStyles = `
    .theme-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .theme-item[data-highlighted] .theme-indicator {
      color: white;
    }
    .theme-item[data-state="checked"] .theme-indicator {
      display: flex;
    }
    .theme-item .theme-indicator {
      display: none;
    }
    .theme-item[data-state="checked"] {
      font-weight: bold;
    }
    
    .design-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .design-item[data-highlighted] .design-indicator {
      color: white;
    }
    .design-item[data-state="checked"] .design-indicator {
      display: flex;
    }
    .design-item .design-indicator {
      display: none;
    }
    .design-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="p-6 bg-white rounded-md">
      <style>{customStyles}</style>
      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-6">
          {/* Theme Selector */}
          <div className="w-48 bg-">
            <Select.Root
              collection={themesCollection}
              defaultValue={[selectedTheme]}
              onValueChange={handleThemeChange}
            >
              <Select.Label className="block text-sm font-bold text-gray-700">Theme</Select.Label>
              <Select.Control className="mt-1 relative">
                <Select.Trigger className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-cyan-600 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-cyan-600">
                  <Select.ValueText className="block truncate capitalize">
                    {selectedTheme.replace(/-/g, " ")}
                  </Select.ValueText>
                  <Select.Indicator className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </Select.Indicator>
                </Select.Trigger>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content className="z-50 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                    {themesCollection.items.map((theme) => (
                      <Select.Item
                        key={theme}
                        item={theme}
                        className="theme-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
                      >
                        <Select.ItemText className="block truncate capitalize">
                          {theme.replace(/-/g, " ")}
                        </Select.ItemText>
                        <Select.ItemIndicator className="theme-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
          </div>

          {/* Layout Selector */}
          <div className="w-64">
            <Select.Root
              collection={designsCollection}
              defaultValue={[selectedDesignIndex.toString()]}
              onValueChange={handleDesignChange}
            >
              <Select.Label className="block text-sm font-bold text-gray-700">Layout</Select.Label>
              <Select.Control className="mt-1 relative">
                <Select.Trigger className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-cyan-600 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-cyan-600">
                  <Select.ValueText className="block truncate">
                    {pageDesigns[selectedDesignIndex].title}
                  </Select.ValueText>
                  <Select.Indicator className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </Select.Indicator>
                </Select.Trigger>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content className="z-50 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                    {designsCollection.items.map((item) => (
                      <Select.Item
                        key={item.index}
                        item={item}
                        className="design-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
                      >
                        <Select.ItemText className="block truncate">
                          {item.design.title}
                        </Select.ItemText>
                        <Select.ItemIndicator className="design-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
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
