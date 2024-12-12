import { useState, useEffect, useCallback } from "react";
import { useStore } from "@nanostores/react";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ChevronDoubleLeftIcon from "@heroicons/react/24/outline/ChevronDoubleLeftIcon";
import { paneFragmentIds, paneFragmentBgColour } from "../../../store/storykeep";
import {
  useStoryKeepUtils,
  createFieldWithHistory,
} from "../../../utils/storykeep/StoryKeep_utils";
import { tailwindToHex, hexToTailwind } from "../../../utils/tailwind/tailwindColors";
import ColorPickerWrapper from "../widgets/ColorPickerWrapper";
import TailwindColorCombobox from "../fields/TailwindColorCombobox";
import { ulid } from "ulid";

interface PaneBgColourProps {
  paneId: string;
}

const PaneBgColour = ({ paneId }: PaneBgColourProps) => {
  const $paneFragmentIds = useStore(paneFragmentIds, { keys: [paneId] });
  const [bgColorFragmentId, setBgColorFragmentId] = useState<string | null>(null);
  const $paneFragmentBgColour = useStore(paneFragmentBgColour, {
    keys: [bgColorFragmentId ?? ""],
  });
  const { updateStoreField, handleUndo } = useStoryKeepUtils(bgColorFragmentId ?? "");

  const [color, setColor] = useState<string | null>(null);
  const [selectedTailwindColor, setSelectedTailwindColor] = useState("");

  useEffect(() => {
    const fragmentIds = $paneFragmentIds[paneId]?.current;
    if (fragmentIds) {
      const colorFragmentId = fragmentIds.find(
        (id) => $paneFragmentBgColour[id]?.current?.type === "bgColour"
      );
      setBgColorFragmentId(colorFragmentId ?? null);
      if (colorFragmentId) {
        const bgColor = $paneFragmentBgColour[colorFragmentId]?.current?.bgColour;
        setColor(bgColor ?? null);
        const matchingTailwindColor = hexToTailwind(bgColor || "");
        setSelectedTailwindColor(matchingTailwindColor || "");
      } else {
        setColor(null);
        setSelectedTailwindColor("");
      }
    }
  }, [$paneFragmentIds, $paneFragmentBgColour, paneId]);

  const handleColorChange = useCallback(
    (newColor: string) => {
      const hexColor = tailwindToHex(`bg-${newColor}`);
      setColor(hexColor);
      const matchingTailwindColor = hexToTailwind(hexColor);
      setSelectedTailwindColor(matchingTailwindColor || "");

      if (bgColorFragmentId) {
        updateStoreField(
          "paneFragmentBgColour",
          {
            ...$paneFragmentBgColour[bgColorFragmentId].current,
            bgColour: hexColor,
          },
          bgColorFragmentId
        );
        updateStoreField("paneFragmentIds", [...$paneFragmentIds[paneId].current], paneId);
      } else {
        const newFragmentId = ulid();
        paneFragmentBgColour.set({
          ...paneFragmentBgColour.get(),
          [newFragmentId]: createFieldWithHistory({
            id: newFragmentId,
            type: "bgColour",
            bgColour: hexColor,
            hiddenViewports: "none",
          }),
        });
        updateStoreField(
          "paneFragmentIds",
          [...$paneFragmentIds[paneId].current, newFragmentId],
          paneId
        );
        setBgColorFragmentId(newFragmentId);
      }
    },
    [bgColorFragmentId, $paneFragmentBgColour, updateStoreField, $paneFragmentIds, paneId]
  );

  const handleTailwindColorChange = useCallback(
    (newTailwindColor: string) => {
      const hexColor = tailwindToHex(`bg-${newTailwindColor}`);
      handleColorChange(hexColor);
    },
    [handleColorChange]
  );

  const handleRemoveColor = useCallback(() => {
    if (bgColorFragmentId) {
      const updatedFragmentIds = $paneFragmentIds[paneId].current.filter(
        (id) => id !== bgColorFragmentId
      );
      updateStoreField("paneFragmentIds", updatedFragmentIds, paneId);
      const updatedBgColour = { ...$paneFragmentBgColour };
      delete updatedBgColour[bgColorFragmentId];
      paneFragmentBgColour.set(updatedBgColour);
      setBgColorFragmentId(null);
      setColor(null);
      setSelectedTailwindColor("");
    }
  }, [bgColorFragmentId, $paneFragmentIds, $paneFragmentBgColour, paneId, updateStoreField]);

  const handleUndoCallback = useCallback(() => {
    if (bgColorFragmentId) {
      handleUndo("paneFragmentBgColour", bgColorFragmentId);
      const undoneColor = $paneFragmentBgColour[bgColorFragmentId]?.current?.bgColour;
      setColor(undoneColor || null);
      const matchingTailwindColor = hexToTailwind(undoneColor || "");
      setSelectedTailwindColor(matchingTailwindColor || "");
    }
  }, [handleUndo, bgColorFragmentId, $paneFragmentBgColour]);

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-4">
        <span className="text-md leading-6 text-mydarkgrey flex-shrink-0">Background Color</span>
        <ColorPickerWrapper
          id="paneBackgroundColor"
          defaultColor={color || "#FFFFFF"}
          onColorChange={handleColorChange}
        />
        {color && (
          <button
            onClick={handleRemoveColor}
            className="text-myorange hover:text-black"
            title="Remove color"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
        <button
          onClick={handleUndoCallback}
          className="disabled:hidden ml-2"
          disabled={
            !bgColorFragmentId || $paneFragmentBgColour[bgColorFragmentId]?.history.length === 0
          }
        >
          <ChevronDoubleLeftIcon
            className="h-8 w-8 text-myblack rounded bg-mygreen/50 px-1 hover:bg-myorange hover:text-white"
            title="Undo"
          />
        </button>
      </div>
      <div>
        <label className="block text-sm text-mydarkgrey mb-1">Tailwind Color Class</label>
        <TailwindColorCombobox
          selectedColor={selectedTailwindColor}
          onColorChange={handleTailwindColorChange}
        />
      </div>
    </div>
  );
};

export default PaneBgColour;
