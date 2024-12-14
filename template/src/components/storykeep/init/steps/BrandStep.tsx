import { useState, useEffect } from "react";
import ArrowLeftIcon from "@heroicons/react/24/outline/ArrowLeftIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import { Combobox } from "@headlessui/react";
import BrandColorPicker from "../../../storykeep/widgets/BrandColorPicker";
import { knownBrand } from "../../../../constants";
import type { Config, InitConfig } from "../../../../types";

interface BrandStepProps {
  onComplete: () => void;
  onBack: () => void;
  isActive: boolean;
  config: Config | null;
  isProcessing: boolean;
  onConfigUpdate: (updates: Record<string, unknown>) => void;
}

export default function BrandStep({
  onComplete,
  onBack,
  isActive,
  config,
  isProcessing,
  onConfigUpdate,
}: BrandStepProps) {
  const [error, setError] = useState<string | null>(null);

  // Track both current and initial values to detect changes
  const [currentValues, setCurrentValues] = useState({
    siteUrl: "",
    slogan: "",
    footer: "",
    brandColors: knownBrand.default,
    gtag: "",
  });

  const [initialValues, setInitialValues] = useState({
    siteUrl: "",
    slogan: "",
    footer: "",
    brandColors: knownBrand.default,
    gtag: "",
  });

  const [selectedBrandPreset, setSelectedBrandPreset] = useState<string>("default");
  const [customColors, setCustomColors] = useState<string | null>(null);

  // Initialize values from config
  useEffect(() => {
    if (config?.init) {
      const initConfig = config.init as InitConfig;
      const values = {
        siteUrl: initConfig.SITE_URL || "",
        slogan: initConfig.SLOGAN || "",
        footer: initConfig.FOOTER || "",
        brandColors:
          initConfig.BRAND_COLOURS || "10120d,fcfcfc,f58333,c8df8c,293f58,a7b1b7,393d34,e3e3e3",
        gtag: typeof initConfig.GTAG === "string" ? initConfig.GTAG : "",
      };

      // Set initial values and fill in defaults for missing ones
      setCurrentValues(values);
      setInitialValues(values);

      // Set initial brand preset with default handling
      const matchingPreset = Object.entries(knownBrand).find(
        ([, value]) => value === initConfig.BRAND_COLOURS
      )?.[0];
      setSelectedBrandPreset(matchingPreset || "default");

      // Inject defaults for critical missing values
      if (!initConfig.WORDMARK_MODE || !initConfig.BRAND_COLOURS || !initConfig.STYLES_VER) {
        onConfigUpdate({
          WORDMARK_MODE: initConfig.WORDMARK_MODE || "default",
          BRAND_COLOURS:
            initConfig.BRAND_COLOURS || "10120d,fcfcfc,f58333,c8df8c,293f58,a7b1b7,393d34,e3e3e3",
          OPEN_DEMO: initConfig.OPEN_DEMO || false,
          STYLES_VER: initConfig.STYLES_VER || `1`,
          HOME_SLUG: initConfig.HOME_SLUG || ``,
          TRACTSTACK_HOME_SLUG: initConfig.TRACTSTACK_HOME_SLUG || `HELLO`,
        });
      }
    }
  }, [config, onConfigUpdate]);

  if (!isActive) return null;

  const handleBrandPresetChange = (preset: string) => {
    if (preset === "custom") {
      const colorsToUse = customColors || currentValues.brandColors;
      setCurrentValues((prev) => ({ ...prev, brandColors: colorsToUse }));
      setSelectedBrandPreset("custom");
      return;
    }

    const currentColors = currentValues.brandColors;
    const isCurrentPreset = Object.entries(knownBrand).some(([, value]) => value === currentColors);
    if (!isCurrentPreset && currentColors) {
      setCustomColors(currentColors);
    }

    const presetColors = knownBrand[preset];
    setCurrentValues((prev) => ({ ...prev, brandColors: presetColors }));
    setSelectedBrandPreset(preset);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Compare current values with initial values to determine what changed
      const updates: Record<string, unknown> = {};

      if (currentValues.siteUrl !== initialValues.siteUrl) {
        updates.SITE_URL = currentValues.siteUrl;
      }
      if (currentValues.slogan !== initialValues.slogan) {
        updates.SLOGAN = currentValues.slogan;
      }
      if (currentValues.footer !== initialValues.footer) {
        updates.FOOTER = currentValues.footer;
      }
      if (currentValues.brandColors !== initialValues.brandColors) {
        updates.BRAND_COLOURS = currentValues.brandColors;
      }
      if (currentValues.gtag !== initialValues.gtag) {
        updates.GTAG = currentValues.gtag;
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        onConfigUpdate(updates);
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    }
  };

  const commonInputClass =
    "block w-full rounded-md border-0 px-2.5 py-1.5 pr-12 text-myblack ring-1 ring-inset ring-myorange/20 placeholder:text-mydarkgrey focus:ring-2 focus:ring-inset focus:ring-myorange xs:text-md xs:leading-6";

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={onBack} className="text-mydarkgrey hover:text-myblue flex items-center">
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back
        </button>
        <h3 className="text-xl font-bold text-mydarkgrey">Brand Customization</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-myblue/5 rounded-lg">
        {error && <div className="p-4 bg-myred/10 text-myred rounded-md">{error}</div>}

        <div className="space-y-4">
          <label className="block">
            <span className="text-mydarkgrey font-bold">Site URL</span>
            <input
              type="url"
              value={currentValues.siteUrl}
              onChange={(e) => setCurrentValues((prev) => ({ ...prev, siteUrl: e.target.value }))}
              placeholder="https://example.com"
              className={commonInputClass}
              required
            />
          </label>

          <label className="block">
            <span className="text-mydarkgrey font-bold">Slogan</span>
            <input
              type="text"
              value={currentValues.slogan}
              onChange={(e) => setCurrentValues((prev) => ({ ...prev, slogan: e.target.value }))}
              placeholder="Your company slogan"
              className={commonInputClass}
              required
            />
          </label>

          <label className="block">
            <span className="text-mydarkgrey font-bold">Footer Text</span>
            <input
              type="text"
              value={currentValues.footer}
              onChange={(e) => setCurrentValues((prev) => ({ ...prev, footer: e.target.value }))}
              placeholder="Footer text"
              className={commonInputClass}
              required
            />
          </label>

          <label className="block">
            <span className="text-mydarkgrey font-bold">Google Analytics ID</span>
            <input
              type="text"
              value={currentValues.gtag}
              onChange={(e) => setCurrentValues((prev) => ({ ...prev, gtag: e.target.value }))}
              placeholder="G-XXXXXXXXXX"
              className={commonInputClass}
            />
            <span className="text-sm text-mydarkgrey mt-1 block">
              Optional: Enter your Google Analytics 4 Measurement ID
            </span>
          </label>

          <div className="space-y-2">
            <span className="text-mydarkgrey font-bold block">Brand Colors</span>
            <div className="space-y-4">
              <Combobox value={selectedBrandPreset} onChange={handleBrandPresetChange}>
                <div className="relative max-w-xs">
                  <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-sm">
                    <Combobox.Input
                      className={`${commonInputClass} pr-10`}
                      displayValue={(preset: string) =>
                        preset.charAt(0).toUpperCase() + preset.slice(1)
                      }
                      onChange={(event) => {
                        const value = event.target.value.toLowerCase();
                        if (value === "custom" || value in knownBrand) {
                          handleBrandPresetChange(value);
                        }
                      }}
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon className="h-5 w-5 text-mydarkgrey" aria-hidden="true" />
                    </Combobox.Button>
                  </div>
                  <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {[...Object.keys(knownBrand), "custom"].map((preset) => (
                      <Combobox.Option
                        key={preset}
                        value={preset}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active ? "bg-myorange/10 text-myblack" : "text-mydarkgrey"
                          }`
                        }
                      >
                        {({ selected, active }) => (
                          <>
                            <span
                              className={`block truncate ${selected ? "font-bold" : "font-normal"}`}
                            >
                              {preset.charAt(0).toUpperCase() + preset.slice(1)}
                            </span>
                            {selected ? (
                              <span
                                className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                  active ? "text-myorange" : "text-myorange"
                                }`}
                              >
                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                              </span>
                            ) : null}
                          </>
                        )}
                      </Combobox.Option>
                    ))}
                  </Combobox.Options>
                </div>
              </Combobox>

              <BrandColorPicker
                value={currentValues.brandColors}
                onChange={(newValue) => {
                  onConfigUpdate({ BRAND_COLOURS: newValue });
                  const matchingPreset = Object.entries(knownBrand).find(
                    ([, presetValue]) => presetValue === newValue
                  )?.[0];
                  setSelectedBrandPreset(matchingPreset || "custom");
                }}
                onEditingChange={() => {}}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={
              isProcessing ||
              !currentValues.siteUrl ||
              !currentValues.slogan ||
              !currentValues.footer
            }
            className="px-4 py-2 text-white bg-myblue rounded hover:bg-black disabled:bg-mylightgrey"
          >
            {isProcessing ? "Saving..." : "Save and Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}