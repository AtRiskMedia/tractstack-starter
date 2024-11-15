import { useState, useEffect } from "react";
import DesignSnapshot from "./DesignSnapshot";
import { classNames } from "../../../utils/helpers";
import type { PageDesign, Theme } from "../../../types";

interface DesignPreviewProps {
  design: PageDesign;
  isSelected: boolean;
  onClick: () => void;
  theme: Theme;
}

const DesignPreview = ({ design, isSelected, onClick, theme }: DesignPreviewProps) => {
  const [snapshotImage, setSnapshotImage] = useState<string>("");
  const [brandColors, setBrandColors] = useState<string[]>([]);

  useEffect(() => {
    const colors: string[] = [];
    for (let i = 1; i <= 8; i++) {
      const color = getComputedStyle(document.documentElement)
        .getPropertyValue(`--brand-${i}`)
        .trim();
      if (color) colors.push(color);
    }
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
      <div className="relative aspect-[4/3] w-full">
        {!snapshotImage || brandColors.length === 0 ? (
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
            className="absolute inset-0 w-full h-full object-cover rounded-lg"
          />
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-2 bg-black/50 text-white rounded-b-lg text-center">
        {design.name}
      </div>
    </button>
  );
};

export default DesignPreview;
