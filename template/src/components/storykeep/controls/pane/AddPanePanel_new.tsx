/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from "react";
import { Switch } from "@headlessui/react";
import { Combobox } from "@ark-ui/react";
import { Select } from "@ark-ui/react/select";
import { Portal } from "@ark-ui/react/portal";
import { createListCollection } from "@ark-ui/react/collection";
import ChevronUpDownIcon from "@heroicons/react/20/solid/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/20/solid/CheckIcon";
import { NodesContext } from "@/store/nodes";
import { NodesSnapshotRenderer, type SnapshotData } from "@/utils/nodes/NodesSnapshotRenderer";
import { createEmptyStorykeep } from "@/utils/common/nodesHelper";
import { cloneDeep } from "@/utils/common/helpers.ts";
import { brandColours, preferredTheme, hasAssemblyAIStore } from "@/store/storykeep.ts";
import { templateCategories } from "@/utils/designs/templateMarkdownStyles";
import { AddPanePanel_newAICopy } from "./AddPanePanel_newAICopy";
import { AddPaneNewCopyMode, type CopyMode } from "./AddPanePanel_newCopyMode";
import { AddPaneNewCustomCopy } from "./AddPanePanel_newCustomCopy";
import { getTitleSlug } from "@/utils/aai/getTitleSlug";
import { contentMap } from "@/store/events.ts";
import { themes } from "@/constants.ts";
import type { Theme } from "@/types";
import { PaneAddMode } from "@/types";

interface AddPaneNewPanelProps {
  nodeId: string;
  first: boolean;
  setMode: (mode: PaneAddMode, reset: boolean) => void;
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

const ITEMS_PER_PAGE = 8;

const AddPaneNewPanel = ({
  nodeId,
  first,
  setMode,
  ctx,
  isStoryFragment = false,
  isContextPane = false,
}: AddPaneNewPanelProps) => {
  const brand = brandColours.get();
  const hasAssemblyAI = hasAssemblyAIStore.get();
  const [copyMode, setCopyMode] = useState<CopyMode>("design");
  const [customMarkdown, setCustomMarkdown] = useState<string>(`...`);
  const [previews, setPreviews] = useState<PreviewPane[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set([0]));
  const [selectedTheme, setSelectedTheme] = useState<Theme>(preferredTheme.get());
  const [useOddVariant, setUseOddVariant] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>(
    templateCategories[first ? 4 : 0]
  );
  const [isInserting, setIsInserting] = useState(false);
  const [aiContentGenerated, setAiContentGenerated] = useState(false);
  const shouldShowDesigns = copyMode !== "ai" || aiContentGenerated;

  // Create collection for Ark UI Combobox
  const categoryCollection = useMemo(() => {
    // Filter categories based on copy mode
    const categories = copyMode === `ai` ? [templateCategories[1]] : templateCategories;

    return createListCollection({
      items: categories,
      itemToValue: (item) => item.id,
      itemToString: (item) => item.title,
    });
  }, [copyMode]);

  // Create collection for Ark UI Listbox (themes)
  const themesCollection = useMemo(() => {
    return createListCollection({
      items: themes,
      itemToValue: (item) => item,
      itemToString: (item) => item.replace(/-/g, " "),
    });
  }, []);

  const filteredTemplates = useMemo(() => {
    if (copyMode === `ai` || isContextPane)
      return templateCategories[1].getTemplates(selectedTheme, brand, useOddVariant);

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
  }, [selectedTheme, useOddVariant, query, selectedCategory, copyMode, isContextPane]);

  useEffect(() => {
    if (copyMode !== "ai") setAiContentGenerated(false);
    if (copyMode !== "ai" || isContextPane) setSelectedCategory(templateCategories[first ? 4 : 0]);
  }, [copyMode]);

  const handleAiContentGenerated = (content: string) => {
    setCustomMarkdown(content);
    setAiContentGenerated(true);
  };

  useEffect(() => {
    const newPreviews = filteredTemplates.map((template, index: number) => {
      const ctx = new NodesContext();
      ctx.addNode(createEmptyStorykeep("tmp"));
      const thisTemplate =
        copyMode === "custom" || (copyMode === "ai" && aiContentGenerated)
          ? {
              ...template,
              markdown: template.markdown && {
                ...template.markdown,
                markdownBody: customMarkdown,
              },
            }
          : template;
      ctx.addTemplatePane("tmp", thisTemplate);
      return { ctx, template: thisTemplate, index };
    });
    setPreviews(newPreviews);
    setCurrentPage(0);
    setRenderedPages(new Set([0]));
  }, [filteredTemplates, customMarkdown, copyMode]);

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

  const handleTemplateInsert = async (template: any, nodeId: string, first: boolean) => {
    if (isInserting) return; // Prevent multiple clicks (as per your previous request)
    setIsInserting(true);

    try {
      if (ctx) {
        // Check if the template has markdown content
        const hasMarkdownContent =
          template?.markdown?.markdownBody &&
          template.markdown.markdownBody.trim() !== "..." &&
          template.markdown.markdownBody.trim().length > 0;

        // If in blank mode, create a copy of template and wipe markdown content
        // if custom mode, user markdown is used
        const insertTemplate = [`blank`, `custom`].includes(copyMode)
          ? {
              ...cloneDeep(template),
              markdown: template.markdown && {
                ...template.markdown,
                markdownBody: copyMode === `blank` ? `...` : customMarkdown,
              },
            }
          : cloneDeep(template);

        // Get the markdown content for title generation
        const markdownContent = [`blank`].includes(copyMode)
          ? null
          : copyMode === `custom`
            ? customMarkdown
            : insertTemplate?.markdown?.markdownBody;

        // Initialize title and slug
        insertTemplate.title = "";
        insertTemplate.slug = "";

        // Only attempt title generation if we have real content and AssemblyAI is available
        if (copyMode === `ai` && hasAssemblyAI && markdownContent && hasMarkdownContent) {
          const existingSlugs = contentMap
            .get()
            .filter((item) => ["Pane", "StoryFragment"].includes(item.type))
            .map((item) => item.slug);

          const titleSlugResult = await getTitleSlug(markdownContent, existingSlugs);

          if (titleSlugResult) {
            insertTemplate.title = titleSlugResult.title;
            insertTemplate.slug = titleSlugResult.slug;
          }
        }

        const ownerId =
          isStoryFragment || isContextPane
            ? nodeId
            : ctx.getClosestNodeTypeFromId(nodeId, "StoryFragment");

        if (isContextPane) {
          insertTemplate.isContextPane = true;
          ctx.addContextTemplatePane(ownerId, insertTemplate);
        } else {
          const newPaneId = ctx.addTemplatePane(
            ownerId,
            insertTemplate,
            nodeId,
            first ? "before" : "after"
          );
          if (newPaneId) ctx.notifyNode(`root`);
        }
        setMode(PaneAddMode.DEFAULT, false);
      }
    } catch (error) {
      console.error("Error inserting template:", error);
    } finally {
      setIsInserting(false);
    }
  };

  // Handle theme selection with Ark UI
  const handleThemeChange = (details: { value: string[] }) => {
    const newTheme = details.value[0] as Theme;
    if (newTheme) {
      setSelectedTheme(newTheme);
    }
  };

  // CSS to properly style the combobox and listbox items with hover and selection
  const customStyles = `
    .category-item[data-highlighted] {
      background-color: #0891b2; /* bg-cyan-600 */
      color: white;
    }
    .category-item[data-highlighted] .category-indicator {
      color: white;
    }
    .category-item[data-state="checked"] .category-indicator {
      display: flex;
    }
    .category-item .category-indicator {
      display: none;
    }
    .category-item[data-state="checked"] {
      font-weight: bold;
    }
    
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
  `;

  return (
    <div className="p-3.5 shadow-inner bg-white">
      <style>{customStyles}</style>
      <div className="p-1.5 bg-white rounded-md flex gap-1 w-full group">
        <button
          onClick={() => setMode(PaneAddMode.DEFAULT, first)}
          className="w-fit px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 focus:bg-gray-200 transition-colors"
        >
          ← Go Back
        </button>

        <div className="flex flex-wrap gap-x-6 gap-y-2 items-center ml-4 py-2">
          <div className="flex-none px-2 py-2.5 text-sm rounded text-cyan-700 font-bold font-action shadow-sm">
            + Design New Pane
          </div>

          {!(copyMode === "ai" && aiContentGenerated) && (
            <AddPaneNewCopyMode selected={copyMode} onChange={setCopyMode} />
          )}
          {copyMode === "custom" && (
            <div className="w-full mt-4">
              <AddPaneNewCustomCopy value={customMarkdown} onChange={setCustomMarkdown} />
            </div>
          )}
          {copyMode === "ai" && !aiContentGenerated && (
            <div className="w-full mt-4">
              <AddPanePanel_newAICopy
                onChange={handleAiContentGenerated}
                isContextPane={isContextPane}
              />
            </div>
          )}
        </div>
      </div>

      {shouldShowDesigns && (
        <>
          <h3 className="px-3.5 pt-4 pb-1.5 font-bold text-black text-xl font-action">
            1. What kind of layout
          </h3>
          <div className="max-w-md">
            <Combobox.Root
              collection={categoryCollection}
              value={[selectedCategory.id]}
              onValueChange={(details) => {
                const id = details.value[0];
                if (id) {
                  const category = templateCategories.find((cat) => cat.id === id);
                  if (category) setSelectedCategory(category);
                }
              }}
              onInputValueChange={(details) => setQuery(details.inputValue)}
              loopFocus={true}
              openOnKeyPress={true}
              composite={true}
            >
              <div className="relative">
                <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                  <Combobox.Input
                    autoComplete="off"
                    className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                    placeholder="Select layout category..."
                  />
                  <Combobox.Trigger className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </Combobox.Trigger>
                </div>

                <Combobox.Content className="absolute z-50 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                  {categoryCollection.items.length === 0 ? (
                    <div className="relative cursor-default select-none py-2 px-4 text-gray-900">
                      Nothing found.
                    </div>
                  ) : (
                    categoryCollection.items.map((category) => (
                      <Combobox.Item
                        key={category.id}
                        item={category}
                        className="category-item relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
                      >
                        <span className="block truncate">{category.title}</span>
                        <span className="category-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      </Combobox.Item>
                    ))
                  )}
                </Combobox.Content>
              </div>
            </Combobox.Root>
          </div>

          <h3 className="px-3.5 pt-4 pb-1.5 font-bold text-black text-xl font-action">
            2. Make it pretty
          </h3>

          <div className="w-40">
            <Select.Root
              collection={themesCollection}
              value={[selectedTheme]}
              onValueChange={handleThemeChange}
            >
              <Select.Label className="block text-sm font-medium text-gray-700">Theme</Select.Label>
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
                        <Select.ItemIndicator className="theme-indicator absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
          </div>

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

          <h3 className="px-3.5 pt-4 pb-1.5 font-bold text-black text-xl font-action">
            3. Click on the design you wish to use:
          </h3>
          <p className="italic">Each design can be further customized once selected.</p>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 p-2">
            {visiblePreviews.map((preview) => (
              <div key={preview.index} className="flex flex-col items-center">
                <div
                  onClick={
                    isInserting
                      ? undefined
                      : () => handleTemplateInsert(preview.template, nodeId, first)
                  }
                  className={`group bg-mywhite shadow-inner relative w-full rounded-sm ${
                    isInserting ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                  } transition-all duration-200 ${
                    preview.snapshot ? "hover:outline hover:outline-4 hover:outline-solid" : ""
                  }`}
                  style={{
                    ...(!preview.snapshot ? { minHeight: "200px" } : {}),
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={preview.template.title}
                >
                  {renderedPages.has(currentPage) && !preview.snapshot && (
                    <NodesSnapshotRenderer
                      ctx={preview.ctx}
                      forceRegenerate={false}
                      onComplete={(data) => {
                        setPreviews((prev) =>
                          prev.map((p) =>
                            p.index === preview.index ? { ...p, snapshot: data } : p
                          )
                        );
                      }}
                    />
                  )}
                  {preview.snapshot && (
                    <div className="p-0.5">
                      <img
                        src={preview.snapshot.imageData}
                        alt={`Template: ${preview.template.title}`}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
                <p className="w-full text-sm bg-mydarkgrey p-2 text-white text-center break-words mt-2">
                  {preview.template.title}
                </p>
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
        </>
      )}
    </div>
  );
};

export default AddPaneNewPanel;
