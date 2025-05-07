/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from "react";
import { Combobox } from "@ark-ui/react";
import { createListCollection } from "@ark-ui/react/collection";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/20/solid";
import { NodesContext } from "@/store/nodes";
import { NodesSnapshotRenderer, type SnapshotData } from "@/utils/nodes/NodesSnapshotRenderer";
import { createEmptyStorykeep } from "@/utils/common/nodesHelper";
import { getTemplateVisualBreakPane } from "@/utils/TemplatePanes";
import { PaneAddMode } from "@/types";
import type { PaneNode, StoryFragmentNode, TemplatePane } from "@/types";

interface AddPaneBreakPanelProps {
  nodeId: string;
  first: boolean;
  setMode: (mode: PaneAddMode) => void;
  ctx?: NodesContext;
  isStoryFragment?: boolean;
}

interface PreviewPane {
  ctx: NodesContext;
  snapshot?: SnapshotData;
  template: any;
  index: number;
  variant: string;
}

const ITEMS_PER_PAGE = 8;
const VARIANTS = [
  "crooked",
  "crookedwide",
  "stepped",
  "steppedwide",
  "cut1",
  "cutwide1",
  "cut2",
  "cutwide2",
  "lowcut1",
  "lowcutwide1",
  "lowcut2",
  "lowcutwide2",
  "jag",
  "jagwide",
  "burst1",
  "burstwide1",
  "burst2",
  "burstwide2",
] as const;

const templateCategory = {
  id: "basic",
  title: "Basic Templates",
  getTemplatesByVariant: (variant: string) => [getTemplateVisualBreakPane(variant)],
};

const AddPaneBreakPanel = ({
  nodeId,
  first,
  setMode,
  ctx,
  isStoryFragment = false,
}: AddPaneBreakPanelProps) => {
  const [previews, setPreviews] = useState<PreviewPane[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set([0]));
  const [variantQuery, setVariantQuery] = useState("");
  const [selectedVariant, setSelectedVariant] = useState<string>("all");

  // Create collection for Ark UI Combobox with filtered variants
  const collection = useMemo(() => {
    const allVariants = ["all", ...VARIANTS];
    const filteredVariants =
      variantQuery === ""
        ? allVariants
        : allVariants.filter((variant) =>
            variant.toLowerCase().includes(variantQuery.toLowerCase())
          );

    return createListCollection({
      items: filteredVariants,
      itemToValue: (item) => item,
      itemToString: (item) => (item === "all" ? "All Variants" : item),
    });
  }, [variantQuery]);

  const templates = useMemo(() => {
    if (selectedVariant === "all") {
      return VARIANTS.flatMap((variant) =>
        templateCategory
          .getTemplatesByVariant(variant)
          .map((template) => ({ ...template, variant }))
      );
    }
    return templateCategory
      .getTemplatesByVariant(selectedVariant)
      .map((template) => ({ ...template, variant: selectedVariant }));
  }, [selectedVariant]);

  useEffect(() => {
    const newPreviews = templates.map((template, index) => {
      const ctx = new NodesContext();
      ctx.addNode(createEmptyStorykeep("tmp"));
      ctx.addTemplatePane("tmp", template);
      return { ctx, template, index, variant: template.variant };
    });
    setPreviews(newPreviews);
    setCurrentPage(0);
    setRenderedPages(new Set([0]));
  }, [templates]);

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

  const handleVisualBreakInsert = (variant: string, nodeId: string, first: boolean) => {
    if (!ctx) return;
    const rawTemplate = getTemplateVisualBreakPane(variant);

    // Cast as TemplatePane to match the expected type
    const template: TemplatePane = {
      ...rawTemplate,
      bgColour: "white", // Will be overridden below
    };

    // If isStoryFragment, nodeId is already the owner, otherwise need to get storyfragment
    const ownerId = isStoryFragment
      ? nodeId
      : ctx.getClosestNodeTypeFromId(nodeId, "StoryFragment");
    const owner = ctx.allNodes.get().get(ownerId);

    // Get adjacent colors based on whether it's a storyFragment/contextPane vs regular pane
    let aboveColor = "white";
    let belowColor = "white";

    if (isStoryFragment) {
      // Working with storyfragment/contextPane directly
      const sf = owner as StoryFragmentNode;
      if (sf.paneIds.length > 0) {
        if (first) {
          // Inserting before first pane
          const firstPane = ctx.allNodes.get().get(sf.paneIds[0]) as PaneNode;
          belowColor = firstPane?.bgColour || "white";
        } else {
          // Inserting after last pane
          const lastPane = ctx.allNodes.get().get(sf.paneIds[sf.paneIds.length - 1]) as PaneNode;
          aboveColor = lastPane?.bgColour || "white";
        }
      }
    } else {
      // Working with existing pane
      const sf = ctx.allNodes.get().get(ownerId) as StoryFragmentNode;
      const currentIndex = sf.paneIds.indexOf(nodeId);
      if (first) {
        // Inserting before current pane
        const abovePaneId = currentIndex > 0 ? sf.paneIds[currentIndex - 1] : null;
        const abovePane = abovePaneId ? (ctx.allNodes.get().get(abovePaneId) as PaneNode) : null;
        const currentPane = ctx.allNodes.get().get(nodeId) as PaneNode;
        aboveColor = abovePane?.bgColour || "white";
        belowColor = currentPane?.bgColour || "white";
      } else {
        // Inserting after current pane
        const belowPaneId =
          currentIndex < sf.paneIds.length - 1 ? sf.paneIds[currentIndex + 1] : null;
        const currentPane = ctx.allNodes.get().get(nodeId) as PaneNode;
        const belowPane = belowPaneId ? (ctx.allNodes.get().get(belowPaneId) as PaneNode) : null;
        aboveColor = currentPane?.bgColour || "white";
        belowColor = belowPane?.bgColour || "white";
      }
    }

    // Override the template colors
    template.bgColour = belowColor;
    const svgFill = aboveColor === belowColor ? "black" : aboveColor;

    if (template.bgPane) {
      if (template.bgPane.type === "visual-break") {
        if (template.bgPane.breakDesktop) {
          template.bgPane.breakDesktop.svgFill = svgFill;
        }
        if (template.bgPane.breakTablet) {
          template.bgPane.breakTablet.svgFill = svgFill;
        }
        if (template.bgPane.breakMobile) {
          template.bgPane.breakMobile.svgFill = svgFill;
        }
      }
    }

    // Add the modified template
    ctx.addTemplatePane(ownerId, template, nodeId, first ? "before" : "after");
    ctx.notifyNode(`root`);
    setMode(PaneAddMode.DEFAULT);
  };

  // CSS to properly style the combobox items with hover and selection
  const comboboxItemStyles = `
    .variant-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .variant-item[data-highlighted] .variant-indicator {
      color: white;
    }
    .variant-item[data-state="checked"] .variant-indicator {
      display: flex;
    }
    .variant-item .variant-indicator {
      display: none;
    }
    .variant-item[data-state="checked"] {
      font-weight: bold;
    }
  `;

  return (
    <div className="p-0.5 shadow-inner">
      <style>{comboboxItemStyles}</style>
      <div className="p-1.5 bg-white rounded-md flex gap-1 w-full group">
        <button
          onClick={() => setMode(PaneAddMode.DEFAULT)}
          className="w-fit px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors"
        >
          ← Go Back
        </button>

        <div className="flex flex-wrap gap-x-6 gap-y-2 items-center ml-4 py-2">
          <div className="flex-none px-2 py-2.5 text-sm rounded text-cyan-700 font-bold font-action shadow-sm">
            + Visual Break
          </div>

          <div className="w-48">
            <Combobox.Root
              collection={collection}
              value={[selectedVariant]}
              onValueChange={(details) => {
                const newVariant = details.value[0] || "all";
                setSelectedVariant(newVariant);
              }}
              onInputValueChange={(details) => setVariantQuery(details.inputValue)}
              loopFocus={true}
              openOnKeyPress={true}
              composite={true}
            >
              <div className="relative">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                  <Combobox.Input
                    autoComplete="off"
                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                    placeholder="Select variant..."
                  />
                  <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </Combobox.Trigger>
                </div>

                <Combobox.Content className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                  {collection.items.length === 0 ? (
                    <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                      Nothing found.
                    </div>
                  ) : (
                    collection.items.map((variant) => (
                      <Combobox.Item
                        key={variant}
                        item={variant}
                        className="variant-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
                      >
                        <span className="block truncate">
                          {variant === "all" ? "All Variants" : variant}
                        </span>
                        <span className="variant-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      </Combobox.Item>
                    ))
                  )}
                </Combobox.Content>
              </div>
            </Combobox.Root>
          </div>
        </div>
      </div>

      <h3 className="px-3.5 pt-4 pb-1.5 font-bold text-black text-xl font-action">
        Click on a break design to use:
      </h3>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-6 p-2">
        {visiblePreviews.map((preview) => (
          <div
            key={preview.index}
            onClick={() => handleVisualBreakInsert(preview.variant, nodeId, first)}
            className={`group bg-mywhite shadow-inner relative w-full rounded-sm cursor-pointer transition-all duration-200 ${
              preview.snapshot ? "hover:outline hover:outline-4 hover:outline-solid" : ""
            }`}
            style={{
              ...(!preview.snapshot ? { minHeight: "100px" } : {}),
            }}
          >
            {renderedPages.has(currentPage) && !preview.snapshot && (
              <NodesSnapshotRenderer
                ctx={preview.ctx}
                forceRegenerate={false}
                outputWidth={400}
                onComplete={(data) => {
                  setPreviews((prev) =>
                    prev.map((p) => (p.index === preview.index ? { ...p, snapshot: data } : p))
                  );
                }}
              />
            )}
            {preview.snapshot && (
              <>
                <div className="p-3.5 mb-4">
                  <img
                    src={preview.snapshot.imageData}
                    alt={`${preview.variant} break ${preview.index + 1}`}
                    className="w-full"
                  />
                </div>
                <div className="rounded-t-md absolute bottom-0 left-0 right-0 bg-mydarkgrey group-hover:bg-myblack text-white px-2 py-1 text-sm">
                  {preview.variant}
                </div>
              </>
            )}
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

export default AddPaneBreakPanel;
