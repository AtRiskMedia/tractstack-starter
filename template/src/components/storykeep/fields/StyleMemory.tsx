import { useStore } from "@nanostores/react";
import EyeDropperIcon from "@heroicons/react/24/outline/EyeDropperIcon";
import ClipboardDocumentIcon from "@heroicons/react/24/outline/ClipboardDocumentIcon";
import { stylesMemoryStore } from "../../../store/storykeep";
import { classNames } from "../../../utils/common/helpers";
import { tagNames } from "../../../types";
import type { ClassNamesPayloadDatumValue, AllTag } from "../../../types";

interface StyleMemoryProps {
  currentKey: AllTag;
  classNamesPayload: ClassNamesPayloadDatumValue | ClassNamesPayloadDatumValue[];
  onPaste: (payload: ClassNamesPayloadDatumValue | ClassNamesPayloadDatumValue[]) => void;
}

const StyleMemory = ({ currentKey, classNamesPayload, onPaste }: StyleMemoryProps) => {
  const $stylesMemory = useStore(stylesMemoryStore);
  const handleCopy = () => {
    stylesMemoryStore.set({
      ...$stylesMemory,
      [currentKey]: classNamesPayload,
    });
  };
  const handlePaste = () => {
    const storedValue = $stylesMemory[currentKey];
    if (storedValue) {
      onPaste(storedValue);
    }
  };
  const isDisabled = !$stylesMemory[currentKey];
  return (
    <div className="flex space-x-2">
      <button
        onClick={handleCopy}
        className="p-1 hover:bg-myorange/20 rounded"
        title={`Copy ${tagNames[currentKey]} styles`}
      >
        <EyeDropperIcon className="h-5 w-5" />
      </button>
      <button
        onClick={handlePaste}
        className={classNames(
          "p-1 hover:bg-myorange/20 rounded",
          isDisabled ? "opacity-50 cursor-not-allowed" : ""
        )}
        disabled={isDisabled}
        title={`Overwrite ${tagNames[currentKey]} styles`}
      >
        <ClipboardDocumentIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default StyleMemory;
