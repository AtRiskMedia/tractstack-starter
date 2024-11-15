import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { previewMode } from "../../../store/storykeep";
import { themeStore } from "../../../store/storykeep";
import BrandColorPicker from "./BrandColorPicker";
import ThemeVisualSelector from "../components/ThemeVisualSelector";
import { getEnvValue, setEnvValue, previewBrandConfigured } from "../../../utils/preview-brand";
import { knownBrand } from "../../../constants";
import type { Theme } from "../../../types";

const PreviewBrandSettings = () => {
  const $previewMode = useStore(previewMode);
  const $theme = useStore(themeStore);
  const [selectedBrandPreset, setSelectedBrandPreset] = useState<string>("default");
  const [customColors, setCustomColors] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [currentBrandString, setCurrentBrandString] = useState(getEnvValue("PUBLIC_BRAND"));

  useEffect(() => {
    const value = getEnvValue("PUBLIC_BRAND");
    const matchingPreset = Object.entries(knownBrand).find(
      ([, presetValue]) => presetValue === value
    )?.[0];

    if (matchingPreset) {
      setSelectedBrandPreset(matchingPreset);
    } else {
      setSelectedBrandPreset("custom");
      setCustomColors(value);
    }
    setCurrentBrandString(value);
  }, [$previewMode]);

  const handleBrandPresetChange = (preset: string) => {
    setHasChanges(true);
    if (preset === "custom") {
      const colorsToUse = customColors || getEnvValue("PUBLIC_BRAND");
      setEnvValue(colorsToUse);
      setSelectedBrandPreset("custom");
      setCurrentBrandString(colorsToUse);
      return;
    }

    const currentColors = getEnvValue("PUBLIC_BRAND");
    const isCurrentPreset = Object.entries(knownBrand).some(([, value]) => value === currentColors);

    if (!isCurrentPreset && currentColors) {
      setCustomColors(currentColors);
    }

    const presetColors = knownBrand[preset];
    setEnvValue(presetColors);
    setSelectedBrandPreset(preset);
    setCurrentBrandString(presetColors);

    // Update CSS variables
    const brandColors = presetColors.split(",").map((color) => `#${color.trim()}`);
    brandColors.forEach((color, index) => {
      document.documentElement.style.setProperty(`--brand-${index + 1}`, color);
    });
  };

  const handleThemeChange = (newTheme: Theme) => {
    setHasChanges(true);
    themeStore.set(newTheme);
  };

  const handleColorPickerChange = (newValue: string) => {
    setHasChanges(true);
    setEnvValue(newValue);
    setCurrentBrandString(newValue);

    // Update CSS variables
    const brandColors = newValue.split(",").map((color) => `#${color.trim()}`);
    brandColors.forEach((color, index) => {
      document.documentElement.style.setProperty(`--brand-${index + 1}`, color);
    });

    // Check if matches any preset
    const matchingPreset = Object.entries(knownBrand).find(
      ([, presetValue]) => presetValue === newValue
    )?.[0];
    setSelectedBrandPreset(matchingPreset || "custom");
  };

  const handleUseColors = () => {
    previewBrandConfigured.set("true");
  };

  const Prompt = () => (
    <div className="bg-myblue/5 p-4 rounded-md mb-4 space-y-4">
      <p className="text-myblue font-bold">Brand changes require your confirmation.</p>
      <div className="flex justify-end space-x-2 mt-6">
        <button
          onClick={handleUseColors}
          className="px-4 py-2 text-black bg-myorange/50 rounded hover:bg-myblue hover:text-white"
        >
          Use this Theme / Colours
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {hasChanges && <Prompt />}

      <div className="rounded-lg bg-mywhite shadow-inner">
        <div className="px-3.5 py-3">
          <div className="space-y-16">
            <div className="space-y-8">
              <label className="block text-md text-mydarkgrey">Brand color palette</label>
              <select
                value={selectedBrandPreset}
                onChange={(e) => handleBrandPresetChange(e.target.value)}
                className="block w-full max-w-xs rounded-md border-0 px-2.5 py-1.5 text-myblack ring-1 ring-inset ring-myorange/20 focus:ring-2 focus:ring-inset focus:ring-myorange"
              >
                {Object.keys(knownBrand).map((preset) => (
                  <option key={preset} value={preset}>
                    {preset.charAt(0).toUpperCase() + preset.slice(1)}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>

              <BrandColorPicker
                value={getEnvValue("PUBLIC_BRAND")}
                onChange={handleColorPickerChange}
              />
              <div className="space-y-4">
                <label className="block text-md text-mydarkgrey mt-12">
                  Select a default visual style
                </label>
                <ThemeVisualSelector
                  value={$theme}
                  onChange={handleThemeChange}
                  brandString={currentBrandString}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {hasChanges && <Prompt />}
    </div>
  );
};

export default PreviewBrandSettings;
