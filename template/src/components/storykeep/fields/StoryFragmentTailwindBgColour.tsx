import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import ChevronDoubleLeftIcon from "@heroicons/react/24/outline/ChevronDoubleLeftIcon";
import { useStore } from "@nanostores/react";
import { storyFragmentTailwindBgColour } from "../../../store/storykeep";
import ColorPickerWrapper from "../widgets/ColorPickerWrapper";
import { getComputedColor, debounce } from "../../../utils/common/helpers";
import {
  hexToTailwind,
  tailwindToHex,
  getTailwindColorOptions,
} from "../../../utils/tailwind/tailwindColors";
import TailwindColorCombobox from "../fields/TailwindColorCombobox";
import type { StoreKey, Config } from "../../../types";

interface StoryFragmentTailwindBgColourProps {
  id: string;
  updateStoreField: (storeKey: StoreKey, newValue: string) => boolean;
  handleUndo: (storeKey: StoreKey, id: string) => void;
  config: Config;
}

const StoryFragmentTailwindBgColour = ({
  id,
  updateStoreField,
  handleUndo,
  config,
}: StoryFragmentTailwindBgColourProps) => {
  const $storyFragmentTailwindBgColour = useStore(storyFragmentTailwindBgColour, { keys: [id] });

  const [localValue, setLocalValue] = useState($storyFragmentTailwindBgColour[id]?.current || "");
  const [selectedTailwindColor, setSelectedTailwindColor] = useState("");

  const hexColor = useMemo(() => {
    const computedColor = getComputedColor(
      tailwindToHex(localValue, config?.init?.BRAND_COLOURS || null)
    );
    return computedColor;
  }, [localValue]);
  const tailwindColorOptions = useMemo(() => getTailwindColorOptions(), []);

  const debouncedUpdateField = useRef(
    debounce((newValue: string) => {
      updateStoreField("storyFragmentTailwindBgColour", newValue);
    }, 300)
  ).current;

  useEffect(() => {
    setLocalValue($storyFragmentTailwindBgColour[id]?.current || "");
    const currentColor = $storyFragmentTailwindBgColour[id]?.current || "";
    const matchingTailwindColor = hexToTailwind(
      tailwindToHex(currentColor, config?.init?.BRAND_COLOURS || null)
    );
    setSelectedTailwindColor(matchingTailwindColor || "");
  }, [$storyFragmentTailwindBgColour[id]?.current]);

  const handleHexColorChange = useCallback(
    (newHexColor: string) => {
      const computedColor = getComputedColor(newHexColor);
      setLocalValue(computedColor.replace("#", ""));
      debouncedUpdateField(`bg-${computedColor.replace("#", "")}`);
      const matchingTailwindColor = hexToTailwind(computedColor);
      setSelectedTailwindColor(matchingTailwindColor || "");
    },
    [debouncedUpdateField]
  );

  const handleTailwindColorChange = useCallback(
    (newTailwindColor: string) => {
      setLocalValue(newTailwindColor);
      debouncedUpdateField(`bg-${newTailwindColor}`);
      setSelectedTailwindColor(newTailwindColor);
    },
    [debouncedUpdateField]
  );

  const handleUndoCallback = useCallback(() => {
    handleUndo("storyFragmentTailwindBgColour", id);
    setLocalValue($storyFragmentTailwindBgColour[id]?.current || "");
    const matchingTailwindColor = tailwindColorOptions.find(
      (color) =>
        tailwindToHex(`bg-${color}`, config?.init?.BRAND_COLOURS || null) ===
        tailwindToHex(
          $storyFragmentTailwindBgColour[id]?.current || "",
          config?.init?.BRAND_COLOURS || null
        )
    );
    setSelectedTailwindColor(matchingTailwindColor || "");
  }, [handleUndo, $storyFragmentTailwindBgColour, id, tailwindColorOptions]);

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center space-x-4">
        <span className="text-md leading-6 text-mydarkgrey flex-shrink-0">Background Color</span>
        <ColorPickerWrapper
          id="storyFragmentTailwindBgColour"
          defaultColor={hexColor}
          onColorChange={handleHexColorChange}
        />
        <button
          onClick={handleUndoCallback}
          className="disabled:hidden ml-2"
          disabled={$storyFragmentTailwindBgColour[id]?.history.length === 0}
        >
          <ChevronDoubleLeftIcon
            className="h-8 w-8 text-myblack rounded bg-mygreen/50 px-1 hover:bg-myorange hover:text-white"
            title="Undo"
          />
        </button>
      </div>
      <div>
        <span className="block text-sm text-mydarkgrey mb-1">Tailwind Color Class</span>
        <TailwindColorCombobox
          selectedColor={selectedTailwindColor}
          onColorChange={handleTailwindColorChange}
          config={config}
        />
      </div>
    </div>
  );
};

export default StoryFragmentTailwindBgColour;
