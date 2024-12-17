import { useEffect, useState } from "react";
import type { Config, PaneDesign, Theme } from "@/types.ts";
import { classNames } from "@/utils/common/helpers.ts";
import PaneDesignSnapshot from "@/components/storykeep/panes/PaneDesignSnapshot.tsx";

interface PanePreviewProps {
  design: PaneDesign;
  isSelected: boolean;
  onClick: () => void;
  theme: Theme;
  config: Config;
}

export default function PanePreview({
  design,
  isSelected,
  onClick,
  theme,
  config,
}: PanePreviewProps) {
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

  // Initialize brand colors from config
  useEffect(() => {
    const brandString = config?.init?.BRAND_COLOURS;
    if (typeof brandString === "string" && brandString.trim()) {
      const colors = brandString.split(",").map((color) => `#${color.trim()}`);
      setBrandColors(colors);
    }
  }, [config?.init?.BRAND_COLOURS]);
  const showSnapshot = snapshotImage && brandColors.length > 0;

  return (
    <button
      onClick={onClick}
      className={classNames(
        "relative rounded-lg transition-all flex flex-col justify-between bg-mydarkgrey p-1",
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
          <div className="inset-0">
            <PaneDesignSnapshot
              config={config}
              design={design}
              theme={theme}
              brandColors={brandColors}
              onComplete={(imageData) => setSnapshotImage(imageData)}
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
      <div className="inset-x-0 bottom-0 p-2 bg-mydarkgrey text-white rounded-b-lg text-center">
        {design.name}
      </div>
    </button>
  );
}
