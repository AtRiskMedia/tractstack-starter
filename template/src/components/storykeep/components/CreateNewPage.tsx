import { useState, useEffect } from "react";
import { navigate } from "astro:transitions/client";
import { useStore } from "@nanostores/react";
import { Combobox } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import ChevronLeftIcon from "@heroicons/react/24/outline/ChevronLeftIcon";
import ChevronRightIcon from "@heroicons/react/24/outline/ChevronRightIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import PreviewPage from "./PreviewPage";
import { viewportKeyStore, creationStateStore, themeStore } from "../../../store/storykeep";
import { debounce } from "../../../utils/helpers";
import { initializeStores } from "../../../utils/compositor/initStore";
import { pageDesigns } from "../../../assets/paneDesigns";
import ThemeSelector from "./ThemeSelector";
import type { ViewportKey, PageDesign, Theme } from "../../../types";

interface CreateNewPageProps {
  mode: "storyfragment" | "context";
  newId: string;
  tractStackId: string;
}

const CreateNewPage = ({ newId, tractStackId, mode }: CreateNewPageProps) => {
  const [selectedDesign, setSelectedDesign] = useState<PageDesign | null>(null);
  const [query, setQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const $theme = useStore(themeStore);
  const $viewportKey = useStore(viewportKeyStore);
  const viewportKey = $viewportKey.value;
  const [pageDesignList, setPageDesignList] = useState<PageDesign[]>([]);

  useEffect(() => {
    const handleResize = () => {
      const scrollBarOffset = window.innerWidth - document.documentElement.clientWidth;
      const previewWidth = window.innerWidth;
      const adjustedWidth =
        previewWidth +
        scrollBarOffset * (window.innerWidth > previewWidth + scrollBarOffset ? 0 : 1);
      let newViewportKey: ViewportKey;
      if (adjustedWidth <= 800) {
        newViewportKey = `mobile`;
      } else if (adjustedWidth <= 1367) {
        newViewportKey = `tablet`;
      } else {
        newViewportKey = `desktop`;
      }
      viewportKeyStore.set({ value: newViewportKey });
    };
    const debouncedHandleResize = debounce(handleResize, 250);
    handleResize();
    window.addEventListener("resize", debouncedHandleResize);
    return () => {
      window.removeEventListener("resize", debouncedHandleResize);
    };
  }, []);

  useEffect(() => {
    const designs = Object.values(pageDesigns($theme)).filter(
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
        setSelectedDesign(designs[currentIndex] || designs[0]);
      }
    } else if (designs.length > 0) {
      setSelectedDesign(designs[0]);
    }
  }, [$theme, pageDesigns]);

  const filteredDesigns =
    query === ""
      ? pageDesignList.filter(
          (design) =>
            (mode === `context` && design.isContext === true) ||
            (mode !== `context` && design.isContext === false)
        )
      : pageDesignList.filter(
          (design) =>
            ((mode === `context` && design.isContext === true) ||
              (mode !== `context` && design.isContext === false)) &&
            design.name.toLowerCase().includes(query.toLowerCase())
        );

  const cycleDesign = (direction: "next" | "prev") => {
    setCurrentIndex((prevIndex) => {
      const newIndex =
        direction === "next"
          ? (prevIndex + 1) % filteredDesigns.length
          : (prevIndex - 1 + filteredDesigns.length) % filteredDesigns.length;
      setSelectedDesign(filteredDesigns[newIndex]);
      return newIndex;
    });
  };

  const handleEditThis = () => {
    if (selectedDesign) {
      const success = initializeStores(newId, tractStackId, selectedDesign, mode);
      if (success) {
        creationStateStore.set({ id: newId, isInitialized: true });
        if (mode === "context") {
          navigate(`/context/create/edit`);
        } else {
          navigate(`/create/edit`);
        }
      }
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    themeStore.set(newTheme);
  };

  if (!selectedDesign) return null;

  return (
    <div className="w-full h-screen overflow-y bg-myoffwhite">
      <div className="rounded-bl-lg rounded-br-lg px-3.5 py-6 shadow-inner bg-white mx-2">
        <div className="space-y-6">
          <div className="flex flex-col space-y-4 max-w-screen-md">
            <Combobox value={selectedDesign} onChange={setSelectedDesign}>
              <Combobox.Label
                htmlFor="page-design-input"
                className="block text-lg text-mydarkgrey mb-2"
              >
                Page Design Starter (you'll get to customize from here...)
              </Combobox.Label>
              <div className="relative">
                <Combobox.Input
                  className="w-full rounded-lg border border-mylightgrey bg-white py-2 pl-3 pr-10 shadow-sm focus:border-mydarkgrey focus:outline-none focus:ring-1 focus:ring-myblue text-xl"
                  onChange={(event) => setQuery(event.target.value)}
                  autoComplete="off"
                  displayValue={(design: PageDesign) => design?.name}
                  id="page-design-input"
                  name="page-design"
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
                </Combobox.Button>

                <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  {filteredDesigns.map((design) => (
                    <Combobox.Option
                      key={design.name}
                      value={design}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active ? "bg-myblue text-white" : "text-black"
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
                          {selected ? (
                            <span
                              className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                active ? "text-white" : "text-myblue"
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

            <div className="flex flex-col space-y-2">
              <div className="flex space-x-2">
                <ThemeSelector value={$theme} onChange={handleThemeChange} />
                <button
                  className="bg-myorange text-white rounded-lg p-2 hover:bg-myblack transition-colors flex items-center justify-center"
                  onClick={() => cycleDesign("prev")}
                  title="Previous design"
                  aria-label="Previous design"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <button
                  className="bg-myorange text-white rounded-lg p-2 hover:bg-myblack transition-colors flex items-center justify-center"
                  onClick={() => cycleDesign("next")}
                  title="Next design"
                  aria-label="Next design"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
                <a
                  data-astro-reload
                  className="bg-myorange/20 text-black rounded-lg p-2 hover:bg-myblack hover:text-white transition-colors flex items-center justify-center"
                  aria-label="Cancel"
                  title="Cancel"
                  href="/storykeep"
                >
                  <XMarkIcon className="h-5 w-5" />
                </a>
                <button
                  disabled={!selectedDesign}
                  aria-label="Create Page"
                  title="Create Page"
                  onClick={() => handleEditThis()}
                  className={`font-bold ${
                    selectedDesign
                      ? "bg-myblue hover:bg-myorange"
                      : "bg-black opacity-10 cursor-not-allowed"
                  } text-white rounded-lg p-2`}
                >
                  MAKE THIS PAGE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedDesign && (
        <div
          className="outline-2 outline-dashed outline-myblue/10 outline-offset-[-2px]
          my-4 bg-myblue/20 py-4"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)",
          }}
        >
          <div
            className={
              selectedDesign.tailwindBgColour ? `bg-${selectedDesign.tailwindBgColour}` : `bg-white`
            }
          >
            <PreviewPage
              design={selectedDesign}
              viewportKey={viewportKey}
              slug="create"
              isContext={mode === "context"}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateNewPage;
