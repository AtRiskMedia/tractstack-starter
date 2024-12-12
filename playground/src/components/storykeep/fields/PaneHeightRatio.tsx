import { useState, useEffect } from "react";
import ChevronDoubleLeftIcon from "@heroicons/react/24/outline/ChevronDoubleLeftIcon";
import InformationCircleIcon from "@heroicons/react/24/outline/InformationCircleIcon";
import { useStore } from "@nanostores/react";
import {
  paneHeightRatioDesktop,
  paneHeightRatioTablet,
  paneHeightRatioMobile,
} from "../../../store/storykeep";
import { useStoryKeepUtils } from "../../../utils/storykeep/StoryKeep_utils";
import type { StoreKey } from "../../../types";

interface PaneHeightRatioProps {
  id: string;
}

const PaneHeightRatio = ({ id }: PaneHeightRatioProps) => {
  const $paneHeightRatioDesktop = useStore(paneHeightRatioDesktop, {
    keys: [id],
  });
  const $paneHeightRatioTablet = useStore(paneHeightRatioTablet, {
    keys: [id],
  });
  const $paneHeightRatioMobile = useStore(paneHeightRatioMobile, {
    keys: [id],
  });

  const { updateStoreField, handleUndo } = useStoryKeepUtils(id);

  const [desktopInput, setDesktopInput] = useState(
    $paneHeightRatioDesktop[id]?.current?.toString() || "0"
  );
  const [tabletInput, setTabletInput] = useState(
    $paneHeightRatioTablet[id]?.current?.toString() || "0"
  );
  const [mobileInput, setMobileInput] = useState(
    $paneHeightRatioMobile[id]?.current?.toString() || "0"
  );

  useEffect(() => {
    setDesktopInput($paneHeightRatioDesktop[id]?.current?.toString() || "0");
    setTabletInput($paneHeightRatioTablet[id]?.current?.toString() || "0");
    setMobileInput($paneHeightRatioMobile[id]?.current?.toString() || "0");
  }, [
    $paneHeightRatioDesktop[id]?.current,
    $paneHeightRatioTablet[id]?.current,
    $paneHeightRatioMobile[id]?.current,
  ]);

  const isPreValid = (value: string): boolean => {
    return /^(\d{1,7}|\d{0,7}\.\d{1,7}|\.\d{1,7}|(\.)|)$/.test(value);
  };

  const isValid = (value: string): boolean => {
    const numValue = parseInt(value);
    return !isNaN(numValue) && numValue >= 10 && numValue <= 200;
  };

  const normalizeValue = (value: string): string => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "0";
    if (numValue === 0) return "0";
    if (numValue < 10) return "10";
    if (numValue > 200) return "200";
    return numValue.toString();
  };

  const handleInputChange = (
    value: string,
    storeKey: StoreKey,
    setter: (value: string) => void
  ) => {
    if (isPreValid(value)) {
      setter(value);
      if (isValid(value)) {
        updateStoreField(storeKey, normalizeValue(value));
      }
    }
  };

  const handleInputBlur = (value: string, storeKey: StoreKey, setter: (value: string) => void) => {
    const normalizedValue = normalizeValue(value);
    setter(normalizedValue);
    updateStoreField(storeKey, normalizedValue);
  };

  const renderInput = (
    value: string,
    setter: (value: string) => void,
    storeKey: StoreKey,
    label: string
  ) => (
    <div className="flex items-center">
      <label className="mr-2 text-lg text-mydarkgrey">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value, storeKey, setter)}
        onBlur={(e) => handleInputBlur(e.target.value, storeKey, setter)}
        className="w-20 rounded-md border-0 px-2 py-1 text-myblack ring-1 ring-inset ring-mygreen focus:ring-2 focus:ring-mygreen text-lg"
      />
    </div>
  );

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <span className="text-md text-mydarkgrey flex-shrink-0">Height Ratio:</span>
        <InformationCircleIcon
          className="h-5 w-5 text-mydarkgrey"
          title="0 means height:auto, otherwise fixed proportion based on viewport; 100 is square, 178.778 is 16/9"
        />
        <button
          onClick={() => {
            handleUndo("paneHeightRatioDesktop", id);
            handleUndo("paneHeightRatioTablet", id);
            handleUndo("paneHeightRatioMobile", id);
          }}
          className="disabled:invisible"
          disabled={
            $paneHeightRatioDesktop[id]?.history.length === 0 &&
            $paneHeightRatioTablet[id]?.history.length === 0 &&
            $paneHeightRatioMobile[id]?.history.length === 0
          }
        >
          <ChevronDoubleLeftIcon
            className="h-5 w-5 text-myblack rounded bg-mygreen/50 hover:bg-myorange hover:text-white"
            title="Undo"
          />
        </button>
      </div>
      <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
        {renderInput(desktopInput, setDesktopInput, "paneHeightRatioDesktop", "Desktop")}
        {renderInput(tabletInput, setTabletInput, "paneHeightRatioTablet", "Tablet")}
        {renderInput(mobileInput, setMobileInput, "paneHeightRatioMobile", "Mobile")}
      </div>
    </div>
  );
};

export default PaneHeightRatio;
