import { useEffect, useState } from "react";
import DesignSnapshot from "./DesignSnapshot";
import { classNames } from "../../../utils/common/helpers";
import type { PageDesign, Theme, Config } from "../../../types";

interface DesignPreviewProps {
  design: PageDesign;
  isSelected: boolean;
  onClick: () => void;
  theme: Theme;
  config: Config;
}

export default function DesignPreview({
  design,
  isSelected,
  onClick,
  theme,
  config,
}: DesignPreviewProps) {
  const [snapshotImage, setSnapshotImage] = useState<string>("");
  const [lastTheme, setLastTheme] = useState<Theme>(theme);

  // Reset snapshot when theme changes
  useEffect(() => {
    if (theme !== lastTheme) {
      setSnapshotImage("");
      setLastTheme(theme);
    }
  }, [theme, lastTheme]);

  // Initialize brand colors from config
  //useEffect(() => {
  //  const brandString = config?.init?.BRAND_COLOURS;
  //  if (typeof brandString === "string" && brandString.trim()) {
  //    const colors = brandString.split(",").map((color) => `#${color.trim()}`);
  //    setBrandColors(colors);
  //  }
  //}, [config?.init?.BRAND_COLOURS]);

  const showSnapshot = !!snapshotImage;

  return (
    <button
      onClick={onClick}
      className={classNames(
        "relative rounded-lg transition-all max-w-[750px]",
        isSelected
          ? "ring-2 ring-myorange ring-offset-2"
          : "hover:ring-2 hover:ring-myorange hover:ring-offset-2"
      )}
      role="radio"
      aria-checked={isSelected}
      aria-label={`Select ${design.name}`}
      name="design-selection"
      type="button"
    >
      <div className="relative aspect-square w-full">
        {!showSnapshot ? (
          <div className="absolute inset-0">
            <DesignSnapshot
              design={design}
              theme={theme}
              onComplete={setSnapshotImage}
              config={config}
            />
          </div>
        ) : (
          <div className="relative w-full h-full">
            <img
              src={snapshotImage}
              alt={`${design.name} design preview`}
              className="absolute inset-0 w-full h-full object-contain object-top rounded-lg"
            />
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-2 bg-mydarkgrey text-white rounded-b-lg text-center">
        {design.name}
      </div>
    </button>
  );
}
