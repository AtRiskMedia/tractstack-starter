import { useMemo, useState, useEffect, useCallback } from "react";
import { useStore } from "@nanostores/react";
import { Combobox } from "@headlessui/react";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import ChevronDoubleLeftIcon from "@heroicons/react/24/outline/ChevronDoubleLeftIcon";
import DevicePhoneMobileIcon from "@heroicons/react/24/outline/DevicePhoneMobileIcon";
import DeviceTabletIcon from "@heroicons/react/24/outline/DeviceTabletIcon";
import ComputerDesktopIcon from "@heroicons/react/24/outline/ComputerDesktopIcon";
import { paneFragmentIds, paneFragmentBgPane } from "../../../store/storykeep";
import { useStoryKeepUtils } from "../../../utils/storykeep";
import { SvgBreaks } from "../../../assets/shapes";
import {
  tailwindToHex,
  getTailwindColorOptions,
  hexToTailwind,
} from "../../../assets/tailwindColors";
import PaneBgColour from "../fields/PaneBgColour";
import TailwindColorCombobox from "../fields/TailwindColorCombobox";
import { getComputedColor, isDeepEqual } from "../../../utils/helpers";

const availableCollections = ["kCz"] as const;
const availableImagesWithPrefix = ["none", ...Object.keys(SvgBreaks)] as const;

type Viewport = "desktop" | "tablet" | "mobile";
type Collection = (typeof availableCollections)[number];
type ImageOption = (typeof availableImagesWithPrefix)[number];

interface ViewportSettings {
  image: ImageOption;
}

interface LocalSettings {
  collection: Collection | "";
  colour: string;
  desktop: ViewportSettings;
  tablet: ViewportSettings;
  mobile: ViewportSettings;
}

interface PaneBreakSettingsProps {
  id: string;
}

export const PaneBreakSettings = ({ id }: PaneBreakSettingsProps) => {
  const $paneFragmentIds = useStore(paneFragmentIds, { keys: [id] });
  const [fragmentId, setFragmentId] = useState<string | null>(null);
  const $paneFragmentBgPane = useStore(paneFragmentBgPane, {
    keys: [fragmentId ?? ""],
  });
  const { updateStoreField, handleUndo } = useStoryKeepUtils(fragmentId ?? "");

  const [selectedTailwindColor, setSelectedTailwindColor] = useState("");
  const [localSettings, setLocalSettings] = useState<LocalSettings>({
    collection: "",
    colour: "",
    desktop: { image: "none" },
    tablet: { image: "none" },
    mobile: { image: "none" },
  });

  const [query, setQuery] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  const availableImages = useMemo(
    () =>
      availableImagesWithPrefix.map((img) =>
        img === "none" ? "none" : (img.replace(localSettings.collection, "") as ImageOption)
      ),
    [localSettings.collection]
  );

  const filteredImages = useMemo(() => {
    return query === ""
      ? availableImages
      : availableImages.filter((image) => image.toLowerCase().includes(query.toLowerCase()));
  }, [query, availableImages]);

  const tailwindColorOptions = useMemo(() => getTailwindColorOptions(), []);

  const updateStore = useCallback(
    (newSettings: LocalSettings) => {
      if (fragmentId && isInitialized) {
        const oldPane = $paneFragmentBgPane[fragmentId].current;

        const hiddenViewports = (["desktop", "tablet", "mobile"] as const)
          .filter((vp) => newSettings[vp].image === "none")
          .join(",");

        const newBgPane = {
          ...oldPane,
          hiddenViewports: hiddenViewports || "none",
          optionsPayload: {
            ...oldPane.optionsPayload,
            artpack: {
              desktop: {
                ...oldPane?.optionsPayload?.artpack?.desktop,
                collection: newSettings.collection,
                image: newSettings.desktop.image === "none" ? "" : newSettings.desktop.image,
                svgFill: newSettings.colour,
              },
              tablet: {
                ...oldPane?.optionsPayload?.artpack?.tablet,
                collection: newSettings.collection,
                image: newSettings.tablet.image === "none" ? "" : newSettings.tablet.image,
                svgFill: newSettings.colour,
              },
              mobile: {
                ...oldPane?.optionsPayload?.artpack?.mobile,
                collection: newSettings.collection,
                image: newSettings.mobile.image === "none" ? "" : newSettings.mobile.image,
                svgFill: newSettings.colour,
              },
            },
          },
        };

        if (!isDeepEqual(oldPane, newBgPane)) {
          updateStoreField("paneFragmentBgPane", newBgPane);
          updateStoreField("paneFragmentIds", [...$paneFragmentIds[id].current], id);
        }
      }
    },
    [fragmentId, $paneFragmentBgPane, updateStoreField, $paneFragmentIds, id, isInitialized]
  );

  const handleChange = useCallback(
    <K extends keyof LocalSettings>(
      field: K,
      value: LocalSettings[K] | ImageOption,
      viewport?: Viewport
    ) => {
      setLocalSettings((prev) => {
        const newSettings = viewport
          ? {
              ...prev,
              [viewport]: {
                ...prev[viewport],
                image: value as ImageOption,
              },
            }
          : { ...prev, [field]: value };
        return newSettings;
      });
    },
    []
  );

  useEffect(() => {
    if (isInitialized) {
      updateStore(localSettings);
    }
  }, [localSettings, updateStore, isInitialized]);

  const handleHexColorChange = useCallback((newHexColor: string) => {
    const computedColor = getComputedColor(newHexColor);
    setLocalSettings((prev) => ({
      ...prev,
      colour: computedColor,
    }));
    const matchingTailwindColor = hexToTailwind(computedColor);
    setSelectedTailwindColor(matchingTailwindColor || "");
  }, []);

  const handleTailwindColorChange = useCallback((newTailwindColor: string) => {
    const hexColor = getComputedColor(tailwindToHex(`bg-${newTailwindColor}`));
    setLocalSettings((prev) => ({
      ...prev,
      colour: hexColor,
    }));
    setSelectedTailwindColor(newTailwindColor);
  }, []);

  useEffect(() => {
    const fragmentIds = $paneFragmentIds[id]?.current;
    if (fragmentIds && fragmentIds.length > 0) {
      setFragmentId(fragmentIds[0]);
    }
  }, [$paneFragmentIds, id]);

  useEffect(() => {
    if (fragmentId && $paneFragmentBgPane[fragmentId]?.current) {
      const currentSettings = $paneFragmentBgPane[fragmentId].current;
      const artpack = currentSettings.optionsPayload.artpack;
      const hiddenViewports = currentSettings.hiddenViewports.split(",");
      const currentColor = artpack?.desktop?.svgFill || "#10120d";
      const matchingTailwindColor = tailwindColorOptions.find(
        (color) => getComputedColor(tailwindToHex(`bg-${color}`)) === currentColor
      );

      setLocalSettings({
        collection: (artpack?.desktop?.collection || "") as Collection,
        colour: currentColor,
        desktop: {
          image: (hiddenViewports.includes("desktop")
            ? "none"
            : artpack?.desktop?.image || "none") as ImageOption,
        },
        tablet: {
          image: (hiddenViewports.includes("tablet")
            ? "none"
            : artpack?.tablet?.image || "none") as ImageOption,
        },
        mobile: {
          image: (hiddenViewports.includes("mobile")
            ? "none"
            : artpack?.mobile?.image || "none") as ImageOption,
        },
      });

      if (matchingTailwindColor) {
        setSelectedTailwindColor(matchingTailwindColor);
      }

      setIsInitialized(true);
    }
  }, [fragmentId, $paneFragmentBgPane, tailwindColorOptions]);

  const handleUndoClick = useCallback(() => {
    if (fragmentId) {
      handleUndo("paneFragmentBgPane", fragmentId);
    }
  }, [fragmentId, handleUndo]);

  const renderViewportSettings = (viewport: Viewport) => {
    const Icon =
      viewport === "mobile"
        ? DevicePhoneMobileIcon
        : viewport === "tablet"
          ? DeviceTabletIcon
          : ComputerDesktopIcon;

    return (
      <div key={viewport} className="mb-0.5">
        <div className="flex items-center space-x-2">
          <Icon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
          <Combobox
            as="div"
            value={localSettings[viewport].image}
            onChange={(value: ImageOption) => handleChange(viewport, value, viewport)}
            className="relative flex-grow"
          >
            <div className="relative mt-1 flex-grow">
              <Combobox.Input
                className="w-full border-mydarkgrey rounded-md py-2 pl-3 pr-10 shadow-sm focus:border-myblue focus:ring-myblue xs:text-sm"
                autoComplete="off"
                displayValue={(image: ImageOption) => image}
                onChange={(event) => setQuery(event.target.value)}
              />
              <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
              </Combobox.Button>
            </div>
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none xs:text-sm">
              {filteredImages.map((image) => (
                <Combobox.Option
                  key={image}
                  value={image}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? "bg-myorange text-white" : "text-black"
                    }`
                  }
                >
                  {({ selected, active }) => (
                    <>
                      <span className={`block truncate ${selected ? "font-bold" : "font-normal"}`}>
                        {image}
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
      </div>
    );
  };

  if (!fragmentId) return <div>Loading...</div>;

  return (
    <div className="flex flex-col space-y-6 my-4">
      <div className="flex justify-between">
        <p className="text-md text-black font-bold">Transition Shape</p>
        <button
          onClick={handleUndoClick}
          className="flex items-center text-myblack bg-mygreen/50 px-2 py-1 rounded hover:bg-myorange hover:text-white disabled:hidden"
          disabled={!fragmentId || $paneFragmentBgPane[fragmentId]?.history.length === 0}
        >
          <ChevronDoubleLeftIcon className="h-5 w-5 mr-1" />
          Undo
        </button>
      </div>

      <div>
        {renderViewportSettings("mobile")}
        {renderViewportSettings("tablet")}
        {renderViewportSettings("desktop")}
      </div>

      <div>
        <label className="block text-sm text-mydarkgrey">Colour (applies to all viewports)</label>
        <input
          type="color"
          value={localSettings.colour}
          onChange={(e) => handleHexColorChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-mydarkgrey shadow-sm focus:border-myblue focus:ring-myblue xs:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-mydarkgrey">Tailwind Color Class</label>
        <TailwindColorCombobox
          selectedColor={selectedTailwindColor}
          onColorChange={handleTailwindColorChange}
        />
      </div>

      <PaneBgColour paneId={id} />
    </div>
  );
};
