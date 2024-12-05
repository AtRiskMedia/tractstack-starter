import { useEffect, useState } from "react";
import DesignSnapshot from "./DesignSnapshot";
import { getEnvValue } from "../../../utils/preview-brand";
import { getPreviewModeValue } from "../../../store/storykeep";
import { classNames } from "../../../utils/helpers";
import type { PageDesign, Theme } from "../../../types";

interface DesignPreviewProps {
  design: PageDesign;
  isSelected: boolean;
  onClick: () => void;
  theme: Theme;
}

export default function DesignPreview({ design, isSelected, onClick, theme }: DesignPreviewProps) {
  const [snapshotImage, setSnapshotImage] = useState<string>("");
  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [lastTheme, setLastTheme] = useState<Theme>(theme);

  // Force regeneration when theme changes
  useEffect(() => {
    if (theme !== lastTheme) {
      setSnapshotImage("");
      setLastTheme(theme);
    }
  }, [theme, lastTheme]);

  useEffect(() => {
    const isPreviewMode = getPreviewModeValue(localStorage.getItem("preview-mode") || "false");
    const brandString = isPreviewMode ? getEnvValue("PUBLIC_BRAND") : import.meta.env.PUBLIC_BRAND;
    const colors = brandString.split(",").map((color: string) => `#${color.trim()}`);
    setBrandColors(colors);
  }, []);

  return (
    <button
      onClick={onClick}
      className={classNames(
        "relative rounded-lg transition-all",
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
        {!snapshotImage || !brandColors.length ? (
          <div className="absolute inset-0">
            <DesignSnapshot
              design={design}
              theme={theme}
              brandColors={brandColors}
              onComplete={(imageData) => setSnapshotImage(imageData)}
            />
          </div>
        ) : (
          <img
            src={snapshotImage}
            alt={`${design.name} design preview`}
            className="absolute inset-0 w-full h-full object-contain object-top rounded-lg"
          />
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-2 bg-mydarkgrey text-white rounded-b-lg text-center">
        {design.name}
      </div>
    </button>
  );
}
