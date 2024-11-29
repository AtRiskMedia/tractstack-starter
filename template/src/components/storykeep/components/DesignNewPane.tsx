import { useState, useEffect } from "react";
import { ulid } from "ulid";
import { useStore } from "@nanostores/react";
import { Combobox } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/20/solid/ChevronUpDownIcon";
import ChevronLeftIcon from "@heroicons/react/20/solid/ChevronLeftIcon";
import ChevronRightIcon from "@heroicons/react/20/solid/ChevronRightIcon";
import CheckIcon from "@heroicons/react/20/solid/CheckIcon";
import XMarkIcon from "@heroicons/react/20/solid/XMarkIcon";
import PreviewPane from "./PreviewPane";
import { paneDesigns } from "../../../assets/paneDesigns";
import { editModeStore, themeStore } from "../../../store/storykeep";
import { tursoClient } from "../../../api/tursoClient";
import { PUBLIC_THEME } from "../../../constants";
import ThemeSelector from "./ThemeSelector";
import type { Theme, PaneDesign, ViewportAuto } from "../../../types";

type ModeType = `design` | `reuse` | `break` | `codehook`;

const DesignNewPane = ({
  id,
  index,
  cancelInsert,
  doInsert,
  tailwindBgColour,
  viewportKey,
  paneIds,
  slug,
  isContext,
  knownCodeHooks,
}: {
  id: string;
  index: number;
  cancelInsert: () => void;
  doInsert: (newPaneIds: string[], newPaneId: string) => void;
  tailwindBgColour: string;
  viewportKey: ViewportAuto;
  paneIds: string[];
  slug: string;
  isContext: boolean;
  knownCodeHooks: string[];
}) => {
  const [mode, setMode] = useState<ModeType>(`design`);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const $theme = useStore(themeStore);
  const [activePaneDesigns, setActivePaneDesigns] = useState<PaneDesign[]>([]);
  const [reusePaneDesigns, setReusePaneDesigns] = useState<PaneDesign[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<PaneDesign | null>(null);
  const [selectedCodehook, setSelectedCodehook] = useState<string>(
    knownCodeHooks?.length ? knownCodeHooks[0] : ""
  );
  const [, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredDesigns =
    query === ""
      ? activePaneDesigns
      : activePaneDesigns.filter((design) =>
          design.name.toLowerCase().includes(query.toLowerCase())
        );

  const cycleDesign = (direction: "next" | "prev") => {
    setCurrentIndex((prevIndex) => {
      const newIndex =
        direction === "next"
          ? (prevIndex + 1) % activePaneDesigns.length
          : (prevIndex - 1 + activePaneDesigns.length) % activePaneDesigns.length;
      setSelectedDesign(activePaneDesigns[newIndex]);
      return newIndex;
    });
  };

  const handleInsert = () => {
    setSaving(true);
    if (mode === "codehook") {
      editModeStore.set({
        id,
        mode: "insert",
        type: "pane",
        payload: {
          storyFragment: id,
          index,
          selectedDesign: {
            id: ulid(),
            name: selectedCodehook,
            slug: selectedCodehook.toLowerCase(),
            type: "codehook",
            panePayload: {
              codeHook: selectedCodehook,
            },
          },
          cancelInsert,
          doInsert,
        },
      });
    } else {
      // Existing design insert logic
      editModeStore.set({
        id,
        mode: "insert",
        type: "pane",
        payload: {
          storyFragment: id,
          index,
          selectedDesign,
          cancelInsert,
          doInsert,
        },
      });
    }
  };

  const changeMode = (newMode: ModeType) => {
    setMode(newMode as ModeType);
    if (newMode === `design`) {
      setActivePaneDesigns(
        paneDesigns($theme, `default`).filter((p: PaneDesign) => p.type === `starter`)
      );
      setSelectedDesign(
        paneDesigns($theme, `default`).filter((p: PaneDesign) => p.type === `starter`)[0]
      );
    } else if (newMode === `break`) {
      setActivePaneDesigns(
        paneDesigns($theme, `default`).filter((p: PaneDesign) => p.type === `break`)
      );
      setSelectedDesign(
        paneDesigns($theme, `default`).filter((p: PaneDesign) => p.type === `break`)[0]
      );
    } else if (newMode === `codehook`) {
      // Just switch mode - codehook already selected
      setSelectedDesign(null);
      setActivePaneDesigns([]);
    } else {
      setActivePaneDesigns(reusePaneDesigns);
      setSelectedDesign(reusePaneDesigns[0]);
    }
    setCurrentIndex(0);
    setQuery(``);
  };

  useEffect(() => {
    if (mode === "design" || mode === "break") {
      let newDesigns: PaneDesign[];

      if (mode === "design") {
        const allStarterDesigns = [
          ...paneDesigns($theme ?? PUBLIC_THEME, "default").filter(
            (p) => p.type === "starter" && p.name
          ),
          ...paneDesigns($theme ?? PUBLIC_THEME, "center").filter(
            (p) => p.type === "starter" && p.name
          ),
          ...paneDesigns($theme ?? PUBLIC_THEME, "onecolumn").filter(
            (p) => p.type === "starter" && p.name
          ),
          ...paneDesigns($theme ?? PUBLIC_THEME, "square").filter(
            (p) => p.type === "starter" && p.name
          ),
          ...paneDesigns($theme ?? PUBLIC_THEME, "16x9").filter(
            (p) => p.type === "starter" && p.name
          ),
        ];
        newDesigns = Array.from(
          new Map(allStarterDesigns.map((design) => [design.name, design])).values()
        ).sort((a, b) => {
          // Convert priority to number and sort in ascending order
          return (Number(a.priority) || 0) - (Number(b.priority) || 0);
        });
      } else {
        newDesigns = paneDesigns($theme ?? PUBLIC_THEME, `default`).filter(
          (p: PaneDesign) => p.type === "break"
        );
      }

      setActivePaneDesigns(newDesigns);

      if (selectedDesign) {
        const updatedDesign = newDesigns.find((d) => d.id === selectedDesign.id);
        setSelectedDesign(updatedDesign || newDesigns[0]);
      } else if (newDesigns.length > 0) {
        setSelectedDesign(newDesigns[0]);
      }
    }
  }, [$theme, mode]);

  useEffect(() => {
    async function runFetch() {
      try {
        setIsLoading(true);
        const designsResult = (await tursoClient.paneDesigns()) as PaneDesign[];
        // prevent use of duplicate panes on one storyFragment
        if (Array.isArray(designsResult)) {
          setReusePaneDesigns(designsResult.filter((p: PaneDesign) => !paneIds.includes(p.id)));
        }
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    }
    runFetch();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  const handleThemeChange = (newTheme: Theme) => {
    themeStore.set(newTheme);
  };

  if (!selectedDesign && mode !== `codehook`) return null;
  return (
    <div id="pane-insert" className="bg-mywhite shadow-inner rounded-lg">
      <div className="p-2 md:px-4 xl:px-6 flex flex-col items-center space-y-4">
        <div className="w-full md:w-auto md:flex-grow max-w-screen-3xl">
          {mode === "codehook" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-x-4">
                {knownCodeHooks.length > 1 ? (
                  <select
                    value={selectedCodehook}
                    onChange={(e) => setSelectedCodehook(e.target.value)}
                    className="w-full rounded-lg border-0 bg-white py-1.5 pl-3 pr-10 text-mydarkgrey shadow-sm ring-1 ring-inset ring-mylightgrey focus:ring-2 focus:ring-inset focus:ring-myorange text-lg md:text-xl xl:leading-6"
                  >
                    {knownCodeHooks.map((hook) => (
                      <option key={hook} value={hook}>
                        {hook}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-lg font-bold p-6 bg-yellow-300/20">{selectedCodehook}</div>
                )}
              </div>
            </div>
          ) : (
            <Combobox
              as="div"
              value={selectedDesign}
              onChange={(design) => {
                setSelectedDesign(design);
                setCurrentIndex(
                  design ? activePaneDesigns.findIndex((d) => d.id === design.id) : 0
                );
              }}
            >
              <div className="flex flex-wrap justify-center md:justify-start gap-x-3 gap-y-0.5 text-sm md:text-md xl:text-lg mb-1">
                <Combobox.Label className="block text-mydarkgrey">
                  {mode === "design"
                    ? "Starter designs"
                    : mode === "break"
                      ? "Transition shapes"
                      : "Re-use existing pane"}
                </Combobox.Label>
                <span className="text-mydarkgrey/85 flex flex-wrap justify-center md:justify-start gap-x-2">
                  {mode !== "design" && (
                    <button
                      onClick={() => changeMode("design")}
                      className="text-black underline hover:underline-offset-2 hover:text-myorange"
                    >
                      Starter designs
                    </button>
                  )}
                  {mode !== "break" && (
                    <button
                      onClick={() => changeMode("break")}
                      className="text-black underline hover:underline-offset-2 hover:text-myorange"
                    >
                      Transition shapes
                    </button>
                  )}
                  {mode !== "reuse" && reusePaneDesigns?.length > 0 && (
                    <button
                      onClick={() => changeMode("reuse")}
                      className="text-black underline hover:underline-offset-2 hover:text-myorange"
                    >
                      Re-use existing pane
                    </button>
                  )}
                  {(mode === "design" || mode === "reuse" || mode === "break") &&
                    knownCodeHooks.length > 0 && (
                      <button
                        onClick={() => changeMode("codehook")}
                        className="text-black underline hover:underline-offset-2 hover:text-myorange"
                      >
                        Code Hook
                      </button>
                    )}
                </span>
              </div>
              <div className="relative">
                <Combobox.Input
                  className="w-full rounded-lg border-0 bg-white py-1.5 pl-3 pr-10 text-mydarkgrey shadow-sm ring-1 ring-inset ring-mylightgrey focus:ring-2 focus:ring-inset focus:ring-myorange text-lg md:text-xl xl:leading-6"
                  onChange={(event) => setQuery(event.target.value)}
                  autoComplete="off"
                  displayValue={(design: PaneDesign | null) => design?.name ?? ""}
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-2 focus:outline-none">
                  <ChevronUpDownIcon className="h-5 w-5 text-myblue" aria-hidden="true" />
                </Combobox.Button>
                {filteredDesigns.length > 0 && (
                  <Combobox.Options className="z-[9999] absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-xl shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {filteredDesigns.map((design) => (
                      <Combobox.Option
                        key={design.id}
                        value={design}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-8 pr-4 ${
                            active ? "bg-myorange text-white" : "text-mydarkgrey"
                          }`
                        }
                      >
                        {({ selected, active }) => (
                          <>
                            <span
                              className={`block truncate ${selected ? "font-bold" : "font-normal"}`}
                            >
                              {design.name}
                            </span>
                            {selected && (
                              <span
                                className={`absolute inset-y-0 left-0 flex items-center pl-1.5 ${
                                  active ? "text-white" : "text-myorange"
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
                )}
              </div>
            </Combobox>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 md:flex-shrink-0">
          <button
            className="bg-myorange text-white rounded-lg p-2 hover:bg-myblack transition-colors flex items-center justify-center"
            onClick={() => cycleDesign("prev")}
            disabled={saving}
            title="Previous design"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            className="bg-myorange text-white rounded-lg p-2 hover:bg-myblack transition-colors flex items-center justify-center"
            onClick={() => cycleDesign("next")}
            disabled={saving}
            title="Next design"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
          <button
            className="bg-myorange/20 text-black rounded-lg p-2 hover:bg-myblack hover:text-white transition-colors flex items-center justify-center"
            onClick={() => cancelInsert()}
            disabled={saving}
            aria-label="Cancel"
            title="Cancel"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          {mode === "codehook" && selectedCodehook && (
            <button
              className="font-bold bg-myblue text-white rounded-lg p-2 hover:bg-myorange transition-colors flex items-center justify-center"
              onClick={handleInsert}
              disabled={saving}
            >
              <span className="mr-2">ADD TO PAGE</span>
              <CheckIcon className="h-5 w-5" />
            </button>
          )}
          {mode === `design` && <ThemeSelector value={$theme} onChange={handleThemeChange} />}
          {selectedDesign && (
            <button
              className="font-bold bg-myblue text-white rounded-lg p-2 hover:bg-myorange transition-colors flex items-center justify-center"
              onClick={() => handleInsert()}
              disabled={saving}
              aria-label="Use this Design"
              title="Use this Design"
            >
              <span>ADD TO PAGE</span>
            </button>
          )}
        </div>
      </div>
      {selectedDesign && (
        <div
          className="mt-12 outline-2 outline-dashed outline-myblue/10 outline-offset-[-2px]
        mt-4 bg-myblue/20 py-4"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)",
          }}
        >
          <div className={tailwindBgColour ? `bg-${tailwindBgColour}` : `bg-white`}>
            <PreviewPane
              slug={slug}
              isContext={isContext}
              design={selectedDesign}
              viewportKey={viewportKey}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignNewPane;
