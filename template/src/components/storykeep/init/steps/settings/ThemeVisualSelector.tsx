import { useState, useEffect } from "react";
import DesignSnapshot from "@/components/storykeep/preview/DesignSnapshot.tsx";
import { pageDesigns } from "@/utils/designs/paneDesigns.ts";
import { themes } from "@/constants.ts";
import type { Theme, Config } from "@/types.ts";

interface ThemeVisualSelectorProps {
  value: Theme;
  onChange: (theme: Theme) => void;
  brandString: string;
  config: Config;
}

const themeNames: Record<Theme, string> = {
  light: "Light",
  "light-bw": "Light Black & White",
  "light-bold": "Light Bold",
  dark: "Dark",
  "dark-bw": "Dark Black & White",
  "dark-bold": "Dark Bold",
};

const getInitialSnapshots = () => ({
  light: "",
  "light-bw": "",
  "light-bold": "",
  dark: "",
  "dark-bw": "",
  "dark-bold": "",
});

const updateColors = (colorString: string) => {
  const colors = colorString.split(",");
  colors.forEach((color, index) => {
    const varName = `--brand-${index + 1}`;
    document.documentElement.style.setProperty(varName, `#${color}`);
  });
};

export default function ThemeVisualSelector({
  value,
  onChange,
  config,
  brandString,
}: ThemeVisualSelectorProps) {
  const [snapshots, setSnapshots] = useState(getInitialSnapshots());
  const [currentBrandString, setCurrentBrandString] = useState(brandString);

  // Reset snapshots when brandString changes
  useEffect(() => {
    if (currentBrandString !== brandString) {
      updateColors(brandString);
      setSnapshots(getInitialSnapshots());
      setCurrentBrandString(brandString);
    }
  }, [brandString, currentBrandString]);

  if (!config) {
    return null;
  }

  // Create config with current brandString
  const thisConfig = {
    ...config,
    init: {
      ...config?.init,
      BRAND_COLOURS: brandString,
    },
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {themes.map((theme) => {
        const design = pageDesigns(theme, thisConfig).basic;
        return (
          <button
            type="button"
            key={theme}
            onClick={() => onChange(theme)}
            className={`group relative rounded-lg transition-all hover:ring-2 hover:ring-myorange hover:ring-offset-2 ${
              value === theme ? "ring-2 ring-myorange ring-offset-2" : ""
            }`}
          >
            <div className="relative aspect-square w-full">
              {!snapshots[theme] ? (
                <div className="absolute inset-0">
                  <DesignSnapshot
                    design={design}
                    theme={theme}
                    onComplete={(imageData) => {
                      setSnapshots((prev) => ({ ...prev, [theme]: imageData }));
                    }}
                    config={thisConfig}
                  />
                </div>
              ) : snapshots[theme] ? (
                <img
                  src={snapshots[theme]}
                  alt={`${themeNames[theme]} theme preview`}
                  className="absolute inset-0 w-full h-full object-contain object-top rounded-lg"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-mylightgrey/10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-myorange"></div>
                </div>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 p-2 bg-mydarkgrey text-white rounded-b-lg text-center">
              {themeNames[theme]}
            </div>
          </button>
        );
      })}
    </div>
  );
}
