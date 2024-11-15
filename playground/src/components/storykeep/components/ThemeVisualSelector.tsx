import { useState, useEffect } from "react";
import DesignSnapshot from "./DesignSnapshot";
import { pageDesigns } from "../../../assets/paneDesigns";
import { getEnvValue } from "../../../utils/preview-brand";
import { getPreviewModeValue } from "../../../store/storykeep";
import type { Theme } from "../../../types";

interface ThemeVisualSelectorProps {
  value: Theme;
  onChange: (theme: Theme) => void;
  brandString?: string; // Local state from EnvironmentSettings
}

const themes: Theme[] = ["light", "light-bw", "light-bold", "dark", "dark-bw", "dark-bold"];

const themeNames: Record<Theme, string> = {
  light: "Light",
  "light-bw": "Light Black & White",
  "light-bold": "Light Bold",
  dark: "Dark",
  "dark-bw": "Dark Black & White",
  "dark-bold": "Dark Bold",
};

const initialSnapshots: Record<Theme, string> = {
  light: "",
  "light-bw": "",
  "light-bold": "",
  dark: "",
  "dark-bw": "",
  "dark-bold": "",
};

export default function ThemeVisualSelector({
  value,
  onChange,
  brandString,
}: ThemeVisualSelectorProps) {
  const [snapshots, setSnapshots] = useState<Record<Theme, string>>(initialSnapshots);
  const [brandColors, setBrandColors] = useState<string[]>([]);
  const [currentBrandString, setCurrentBrandString] = useState("");

  useEffect(() => {
    // In preview mode, use getEnvValue
    // Otherwise use the passed brandString
    const isPreviewMode = getPreviewModeValue(localStorage.getItem("preview-mode") || "false");
    const effectiveBrandString = isPreviewMode ? getEnvValue("PUBLIC_BRAND") : brandString;

    if (effectiveBrandString && effectiveBrandString !== currentBrandString) {
      const colors = effectiveBrandString.split(",").map((color) => `#${color.trim()}`);
      setBrandColors(colors);
      setSnapshots(initialSnapshots); // Reset all snapshots when colors change
      setCurrentBrandString(effectiveBrandString);
    }
  }, [brandString, currentBrandString]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {themes.map((theme) => {
        const design = pageDesigns(theme).basic;
        return (
          <button
            key={theme}
            onClick={() => onChange(theme)}
            className={`group relative rounded-lg transition-all hover:ring-2 hover:ring-myorange hover:ring-offset-2 ${
              value === theme ? "ring-2 ring-myorange ring-offset-2" : ""
            }`}
          >
            <div className="relative aspect-square w-full">
              {!snapshots[theme] && brandColors.length > 0 ? (
                <div className="absolute inset-0">
                  <DesignSnapshot
                    design={design}
                    theme={theme}
                    brandColors={brandColors}
                    onComplete={(imageData) => {
                      setSnapshots((prev) => ({ ...prev, [theme]: imageData }));
                    }}
                  />
                </div>
              ) : snapshots[theme] ? (
                <img
                  src={snapshots[theme]}
                  alt={`${themeNames[theme]} theme preview`}
                  className="absolute inset-0 w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-mylightgrey/10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-myorange"></div>
                </div>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 p-2 bg-black/50 text-white rounded-b-lg text-center">
              {themeNames[theme]}
            </div>
          </button>
        );
      })}
    </div>
  );
}
