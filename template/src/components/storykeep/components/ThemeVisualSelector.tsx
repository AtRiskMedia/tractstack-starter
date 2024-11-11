import { useState, useEffect } from "react";
import DesignSnapshot from "./DesignSnapshot";
import { pageDesigns } from "../../../assets/paneDesigns";
import type { Theme } from "../../../types";

interface ThemeVisualSelectorProps {
  value: Theme;
  onChange: (theme: Theme) => void;
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

export default function ThemeVisualSelector({ value, onChange }: ThemeVisualSelectorProps) {
  const [snapshots, setSnapshots] = useState<Record<Theme, string>>(initialSnapshots);
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
            <div className="relative aspect-[4/3] w-full">
              {!snapshots[theme] || brandColors.length === 0 ? (
                <div className="absolute inset-0">
                  <DesignSnapshot
                    design={design}
                    theme={theme}
                    brandColors={brandColors}
                    onComplete={(imageData) =>
                      setSnapshots((prev) => ({ ...prev, [theme]: imageData }))
                    }
                  />
                </div>
              ) : (
                <img
                  src={snapshots[theme]}
                  alt={`${themeNames[theme]} theme preview`}
                  className="absolute inset-0 w-full h-full object-cover rounded-lg"
                />
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
