import { useEffect, useState, useCallback } from "react";
import { navigate } from "astro:transitions/client";
import { useStore } from "@nanostores/react";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import { Combobox } from "@headlessui/react";
import DesignPreview from "../preview/DesignPreview";
import { initializeStores } from "../../../utils/storykeep/state/initStore";
import { themeStore, creationStateStore } from "../../../store/storykeep";
import { classNames } from "../../../utils/common/helpers";
import { parseMarkdownSections } from "../../../utils/compositor/markdownUtils";
import { genAiPrompt } from "../../../../config/prompts.json";
import { pageDesigns } from "../../../utils/designs/paneDesigns";
import ThemeSelector from "../widgets/ThemeSelector";
import GeneratePageModal from "../create/GeneratePageModal";
import type {
  Config,
  PaneDesign,
  PageDesign,
  Theme,
  GenerateStage,
  GeneratedCopy,
} from "../../../types";

interface CreateNewPageProps {
  mode: "storyfragment" | "context";
  newId: string;
  tractStackId: string;
  contentMapSlugs: string[];
  hello: boolean;
  config: Config;
}

const pageTypes = [
  { id: 1, name: "Home Page" },
  { id: 2, name: "Long-form content" },
];
const pageTypesContext = [{ id: 3, name: "Short context page" }];

interface PageType {
  id: number;
  name: string;
}

function extractImageMarkdown(markdown: string): string | null {
  const bulletImageRegex = /^\s*\*\s*!\[.*?\]\(.*?\)\s*$/m;
  const match = markdown.match(bulletImageRegex);
  return match ? match[0] : null;
}
function convertToOrderedList(markdown: string): string {
  const lines = markdown.split(/\n+/).filter((line) => line.trim());
  const numberedLines = lines.map((line, index) => {
    const cleanLine = line.replace(/^#+\s*/, "").trim();
    return `${index + 1}. ${cleanLine}`;
  });
  return numberedLines.join("\n") + "\n";
}

const CreateNewPage = ({
  newId,
  tractStackId,
  mode,
  contentMapSlugs,
  hello,
  config,
}: CreateNewPageProps) => {
  const [stage, setStage] = useState<GenerateStage>("GENERATING_COPY");
  const $theme = useStore(themeStore);
  const [missionInput, setMissionInput] = useState("");
  const [contentInput, setContentInput] = useState("");
  const [selectedPageType, setSelectedPageType] = useState<PageType>(
    mode !== `context` ? pageTypes[0] : pageTypesContext[0]
  );
  const [query, setQuery] = useState("");
  const [selectedDesign, setSelectedDesign] = useState<PageDesign | null>(null);
  const [pageDesignList, setPageDesignList] = useState<PageDesign[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePageTypeChange = (pageType: PageType | null) => {
    if (pageType) {
      setSelectedPageType(pageType);
    }
  };

  const filteredPageTypes =
    mode !== `context`
      ? query === ""
        ? pageTypes
        : pageTypes.filter((type) => type.name.toLowerCase().includes(query.toLowerCase()))
      : query === ""
        ? pageTypesContext
        : pageTypesContext.filter((type) => type.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const designs = Object.values(pageDesigns($theme, config)).filter(
      (design) =>
        (mode === `context` && design.isContext === true) ||
        (mode !== `context` && design.isContext === false)
    );
    setPageDesignList(designs);
    if (selectedDesign) {
      const newSelectedDesign = designs.find((d) => d.name === selectedDesign.name);
      if (newSelectedDesign) {
        setSelectedDesign(newSelectedDesign);
      } else {
        setSelectedDesign(designs[0]);
      }
    } else if (designs.length > 0) {
      setSelectedDesign(designs[0]);
    }
  }, [$theme, pageDesigns]);

  const handleThemeChange = (newTheme: Theme) => {
    themeStore.set(newTheme);
  };

  const isValid = missionInput.length >= 10 && contentInput.length >= 10 && selectedDesign;

  const handleGenerateCopy = useCallback(async (): Promise<GeneratedCopy | null> => {
    const askLemur = true;
    if (askLemur) {
      const response = await fetch("/api/aai/askLemur", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `${genAiPrompt}. Here's some additional context: ${missionInput}`,
          input_text: contentInput,
        }),
      });
      const result = await response.json();
      console.log(result.data.response);
      console.log(result.data.usage);
      return parseMarkdownSections(result.data.response);
    } else {
      console.log(`must update prompt for context page gen`);
      const copy = {
        pageTitle: `Page Title`,
        title: `## add a catchy title here\n\nyour story continues... and continues... and continues... and continues... and continues... and continues... with nice layout and typography.\n\n[Try it now!](try) &nbsp; [Learn more](learn)\n`,
        paragraphs: [
          `### tell us what happened\n\nyour story continues... and continues... and continues... and continues... and continues... and continues... with nice layout and typography.\n\n#### Add in those important details\n\nWrite for both the humans and for the search engine rankings!`,
          `### tell us what happened\n\nyour story continues... and continues... and continues... and continues... and continues... and continues... with nice layout and typography.\n\n#### Add in those important details\n\nWrite for both the humans and for the search engine rankings!`,
          `### tell us what happened\n\nyour story continues... and continues... and continues... and continues... and continues... and continues... with nice layout and typography.\n\n#### Add in those important details\n\nWrite for both the humans and for the search engine rankings!`,
        ],
      };
      return copy;
    }
  }, [contentInput, missionInput]);

  const handlePrepareDesign = useCallback(
    async (generatedCopy: GeneratedCopy): Promise<null | PageDesign> => {
      if (!selectedDesign) return null;

      const newPaneDesigns: PaneDesign[] = [];

      selectedDesign.paneDesigns.forEach((originalPane) => {
        if (!originalPane) return;

        switch (originalPane.designType) {
          // currently we aren't using section in the AI generated content; but we could
          case "section":
          case "decorative":
            // Pass through decorative panes unchanged
            newPaneDesigns.push(originalPane);
            break;

          case "hero": {
            // Replace markdown body in title pane with generated title
            const titlePane = structuredClone(originalPane);
            if (titlePane.fragments?.length) {
              titlePane.fragments = titlePane.fragments.map((fragment) => {
                if (fragment.type === "markdown") {
                  return {
                    ...fragment,
                    markdownBody: generatedCopy.title ?? ``,
                  };
                }
                return fragment;
              });
            }
            newPaneDesigns.push(titlePane);
            break;
          }

          case "hero-image": {
            // Replace markdown body in title pane with generated title
            const titlePane = structuredClone(originalPane);
            if (titlePane.fragments?.length) {
              titlePane.fragments = titlePane.fragments.map((fragment) => {
                if (fragment.type === "markdown") {
                  const OL = convertToOrderedList(generatedCopy?.title || ``);
                  const UL = extractImageMarkdown(fragment.markdownBody) || ``;
                  const newHeroCopy = `${OL}${UL}`;
                  return {
                    ...fragment,
                    markdownBody: newHeroCopy,
                  };
                }
                return fragment;
              });
            }
            newPaneDesigns.push(titlePane);
            break;
          }

          case "copy":
            // Create a new pane for each paragraph while preserving styling
            generatedCopy.paragraphs.forEach((paragraph, i) => {
              const isOdd = i % 2 === 1;
              const originalPaneOdd = selectedDesign?.paneDesignsOdd?.[originalPane.id];
              const paragraphPane = structuredClone(!isOdd ? originalPane : originalPaneOdd);
              if (paragraphPane?.fragments?.length) {
                paragraphPane.fragments = paragraphPane.fragments.map((fragment) => {
                  if (fragment.type === "markdown") {
                    return {
                      ...fragment,
                      markdownBody: paragraph ?? ``,
                    };
                  }
                  return fragment;
                });
              }
              if (paragraphPane) newPaneDesigns.push(paragraphPane);
            });
            break;
        }
      });
      return {
        ...selectedDesign,
        pageTitle: generatedCopy.pageTitle,
        paneDesigns: newPaneDesigns,
      };
    },
    [selectedDesign]
  );

  const handleLoadDesign = useCallback(
    async (userDesign: PageDesign): Promise<boolean> => {
      if (!userDesign) return false;
      const success = initializeStores(
        newId,
        tractStackId,
        userDesign,
        mode,
        contentMapSlugs,
        hello,
        true
      );
      if (success) creationStateStore.set({ id: newId, isInitialized: true });
      return success;
    },
    [newId, tractStackId, mode]
  );

  const handleGenerateComplete = useCallback(() => {
    if (mode === "context") {
      navigate(`/context/create/edit`);
    } else {
      navigate(`/create/edit`);
    }
  }, [mode]);

  const runGeneration = useCallback(async () => {
    try {
      const generatedCopy = await handleGenerateCopy();
      if (!generatedCopy) {
        throw new Error("Failed to generate copy");
      }

      setStage("PREPARING_DESIGN");
      const userDesign = await handlePrepareDesign(generatedCopy);
      if (!userDesign) {
        throw new Error("Failed to prepare design");
      }

      setStage("LOADING_DESIGN");
      const success3 = await handleLoadDesign(userDesign);
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!success3) {
        throw new Error("Failed to load design");
      }

      setStage("COMPLETED");
      handleGenerateComplete();
    } catch (error) {
      console.error("Error during page generation:", error);
      setStage("ERROR");
    }
  }, [handleGenerateCopy, handlePrepareDesign, handleLoadDesign, handleGenerateComplete]);

  const handleGenerateDraft = useCallback(() => {
    if (!isValid || !selectedDesign || isGenerating) return;
    setIsGenerating(true);
    runGeneration();
  }, [isValid, selectedDesign, isGenerating, runGeneration]);

  return (
    <div
      className="outline-2 outline-dashed outline-myblue/10 outline-offset-[-2px]
          my-4 bg-myblue/20 py-4"
      style={{
        backgroundImage:
          "repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)",
      }}
    >
      <div className="rounded-lg px-3.5 py-6 shadow-inner bg-white mx-4">
        <div className="flex flex-col space-y-12">
          <div className="relative">
            <h2 className="inline-block font-action text-myblue text-2xl md:text-3xl">
              Create a New Web Page
            </h2>
            <a
              href="/storykeep"
              className={classNames(
                "absolute right-0 top-1/2 transform -translate-y-1/2",
                "bg-black hover:bg-myorange text-white rounded-full p-2 shadow-lg",
                "transition-all duration-300 ease-in-out"
              )}
              title="Cancel"
            >
              <XMarkIcon className="w-6 h-6" />
            </a>
          </div>

          <div>
            <label
              htmlFor="page-type-input"
              className="block text-xl md:text-2xl text-mydarkgrey mb-2"
            >
              What kind of web page will this be?
            </label>
            <Combobox<PageType> value={selectedPageType} onChange={handlePageTypeChange}>
              <div className="relative mt-1 max-w-sm">
                <Combobox.Input
                  id="page-type-input"
                  className="w-full text-xl p-2 border border-mylightgrey rounded-md shadow-sm focus:ring-myblue focus:border-myblue"
                  onChange={(event) => setQuery(event.target.value)}
                  displayValue={
                    mode !== `context`
                      ? (type: (typeof pageTypes)[0]) => type.name
                      : (type: (typeof pageTypesContext)[0]) => type.name
                  }
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
                </Combobox.Button>
                <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {filteredPageTypes.map((type) => (
                    <Combobox.Option
                      key={type.id}
                      value={type}
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
                            {type.name}
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
              </div>
            </Combobox>
          </div>

          <div>
            <fieldset>
              <div className="flex justify-between items-center mb-4">
                <legend className="block text-xl md:text-2xl text-mydarkgrey">
                  Select a design starter *you'll get to customize from here
                </legend>
              </div>
              <div className="pb-12">
                <ThemeSelector value={$theme} onChange={handleThemeChange} />
              </div>

              <div
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-12"
                role="radiogroup"
              >
                {pageDesignList.map((design) => (
                  <DesignPreview
                    key={design.name}
                    design={design}
                    isSelected={selectedDesign?.name === design.name}
                    onClick={() => setSelectedDesign(design)}
                    theme={$theme}
                    config={config}
                  />
                ))}
              </div>
            </fieldset>
          </div>

          <div>
            <label
              htmlFor="mission-input"
              className="block text-xl md:text-2xl text-mydarkgrey mb-2"
            >
              Please describe your "business" or "mission" and describe your target audience. What
              will they get out of this page? What do you hope they get out of this visit? Rough
              notes only, please. [You may need to write: 'Please write in the first-person
              perspective' for a personal website.]
            </label>
            <textarea
              id="mission-input"
              value={missionInput}
              maxLength={2000}
              onChange={(e) => setMissionInput(e.target.value)}
              className="w-full text-xl h-32 p-2 border border-mylightgrey rounded-md shadow-sm focus:ring-myblue focus:border-myblue"
              placeholder="Enter your mission and audience details..."
            />
          </div>

          <div>
            <label
              htmlFor="content-input"
              className="block text-xl md:text-2xl text-mydarkgrey mb-2"
            >
              Please provide some relevant text. This could be copy pasted from a Word doc or PDF,
              or perhaps from an existing web page. Just what's relevant for writing this page and
              pay no attention whatsoever to formatting!! We'll spin up a draft page based on it for
              you to edit then publish.
            </label>
            <textarea
              id="content-input"
              value={contentInput}
              maxLength={10000}
              onChange={(e) => setContentInput(e.target.value)}
              className="w-full text-xl h-48 p-2 border border-mylightgrey rounded-md shadow-sm focus:ring-myblue focus:border-myblue"
              placeholder="Paste your relevant content here..."
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-xl md:text-2xl font-bold text-mydarkgrey">
              Ready to make this page?
            </h3>
            <p className="text-lg md:text-xl">
              We'll send your request through a AI-powered workflow and generate you a draft web
              page for you in seconds!
            </p>
            <button
              disabled={!isValid || isGenerating}
              onClick={handleGenerateDraft}
              className={`font-bold ${
                isValid ? "bg-myorange hover:bg-myblue" : "bg-black opacity-10 cursor-not-allowed"
              } text-white rounded-lg p-2`}
            >
              GENERATE DRAFT
            </button>

            {isGenerating && <GeneratePageModal stage={stage} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateNewPage;
