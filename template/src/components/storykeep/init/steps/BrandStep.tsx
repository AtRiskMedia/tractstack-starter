import { useState, useEffect } from "react";
import ArrowLeftIcon from "@heroicons/react/24/outline/ArrowLeftIcon";
import CheckIcon from "@heroicons/react/24/outline/CheckIcon";
import ChevronUpDownIcon from "@heroicons/react/24/outline/ChevronUpDownIcon";
import { Combobox } from "@headlessui/react";
import BrandColorPicker from "@/components/storykeep/widgets/BrandColorPicker.tsx";
import ThemeVisualSelector from "./settings/ThemeVisualSelector";
import OpenGraphSettings from "./settings/OpenGraphSettings";
import SocialLinks from "./settings/SocialLinks";
import { formatAndValidateUrl } from "@/utils/common/helpers.ts";
import BrandImageUploads from "./settings/BrandImageUploads";
import WordMarkMode from "./settings/WordMarkMode";
import { knownBrand } from "@/constants.ts";
import type { Config, InitConfig, Theme } from "@/types.ts";
import type { FocusEvent, FormEvent } from "react";

interface BrandStepProps {
  onComplete: () => void;
  onBack: () => void;
  isActive: boolean;
  config: Config | null;
  isProcessing: boolean;
  onConfigUpdate: (updates: Record<string, unknown>) => void;
}

interface BrandFormValues {
  siteUrl: string;
  slogan: string;
  footer: string;
  brandColors: string;
  theme: Theme;
  gtag: string;
  ogTitle: string;
  ogAuthor: string;
  ogDesc: string;
  socialLinks: string;
  og: string;
  oglogo: string;
  logo: string;
  wordmark: string;
  favicon: string;
  keyboardAccessible: boolean;
  wordmarkMode: string;
}

const getDefaultValues = (): BrandFormValues => ({
  siteUrl: "https://example.com",
  slogan: "Your company slogan",
  footer: 'Made with Tract Stack | the "free web press" where ideas build community',
  brandColors: knownBrand.default,
  theme: "light-bold",
  gtag: "",
  ogTitle: "",
  ogAuthor: "",
  ogDesc: "",
  socialLinks: "",
  og: "",
  oglogo: "",
  logo: "",
  wordmark: "",
  favicon: "",
  keyboardAccessible: true,
  wordmarkMode: "default",
});

const fieldToConfigKey: Record<keyof BrandFormValues, string> = {
  siteUrl: "SITE_URL",
  slogan: "SLOGAN",
  footer: "FOOTER",
  brandColors: "BRAND_COLOURS",
  theme: "THEME",
  gtag: "GTAG",
  ogTitle: "OGTITLE",
  ogAuthor: "OGAUTHOR",
  ogDesc: "OGDESC",
  socialLinks: "SOCIALS",
  og: "OG",
  oglogo: "OGLOGO",
  logo: "LOGO",
  wordmark: "WORDMARK",
  favicon: "FAVICON",
  keyboardAccessible: "KEYBOARD_ACCESSIBLE",
  wordmarkMode: "WORDMARK_MODE",
};

export default function BrandStep({
  onComplete,
  onBack,
  isActive,
  config,
  isProcessing,
  onConfigUpdate,
}: BrandStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const defaultValues = getDefaultValues();
  const [currentValues, setCurrentValues] = useState<BrandFormValues>(defaultValues);
  const [initialValues, setInitialValues] = useState<BrandFormValues>(defaultValues);

  const matchingPreset = Object.entries(knownBrand).find(
    ([, value]) => value === config?.init?.BRAND_COLOURS
  )?.[0];
  const [selectedBrandPreset, setSelectedBrandPreset] = useState<string>(
    typeof matchingPreset === `undefined` ? `custom` : matchingPreset
  );
  const [customColors, setCustomColors] = useState<string | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  useEffect(() => {
    if (config?.init) {
      const initConfig = config.init as InitConfig;

      // Keep this essential change detection since code base relies on it
      const hasEssentialChanges =
        initConfig.SITE_URL !== initialValues.siteUrl ||
        initConfig.BRAND_COLOURS !== initialValues.brandColors ||
        initConfig.THEME !== initialValues.theme ||
        initConfig.WORDMARK_MODE !== initialValues.wordmarkMode;

      if (hasEssentialChanges) {
        const values = {
          // Merge new config values with current values rather than replacing
          ...currentValues,
          siteUrl: initConfig.SITE_URL || currentValues.siteUrl,
          slogan: initConfig.SLOGAN || currentValues.slogan,
          footer: initConfig.FOOTER || currentValues.footer,
          brandColors: initConfig.BRAND_COLOURS || currentValues.brandColors,
          gtag: typeof initConfig.GTAG === "string" ? initConfig.GTAG : currentValues.gtag,
          theme: (initConfig.THEME as Theme) || currentValues.theme,
          wordmarkMode: initConfig.WORDMARK_MODE || currentValues.wordmarkMode,
          ogTitle: initConfig.OGTITLE || currentValues.ogTitle,
          ogAuthor: initConfig.OGAUTHOR || currentValues.ogAuthor,
          ogDesc: initConfig.OGDESC || currentValues.ogDesc,
          socialLinks: initConfig.SOCIALS || currentValues.socialLinks,
          og: initConfig.OG || currentValues.og,
          oglogo: initConfig.OGLOGO || currentValues.oglogo,
          logo: initConfig.LOGO || currentValues.logo,
          wordmark: initConfig.WORDMARK || currentValues.wordmark,
          favicon: initConfig.FAVICON || currentValues.favicon,
          keyboardAccessible: initConfig?.KEYBOARD_ACCESSIBLE || currentValues.keyboardAccessible,
        };

        setCurrentValues(values);
        setInitialValues(values);
      }

      // Keep the existing initialization code that project relies on
      if (!initConfig.WORDMARK_MODE || !initConfig.BRAND_COLOURS) {
        onConfigUpdate({
          SITE_INIT: initConfig.SITE_INIT || false,
          WORDMARK_MODE: initConfig.WORDMARK_MODE || "default",
          BRAND_COLOURS:
            initConfig.BRAND_COLOURS || "10120d,fcfcfc,f58333,c8df8c,293f58,a7b1b7,393d34,e3e3e3",
          OPEN_DEMO: initConfig.OPEN_DEMO || false,
          STYLES_VER: initConfig.STYLES_VER || ``,
          HOME_SLUG: initConfig.HOME_SLUG || ``,
          TRACTSTACK_HOME_SLUG: initConfig.TRACTSTACK_HOME_SLUG || ``,
          THEME: initConfig.THEME || "light-bold",
          SOCIALS: initConfig.SOCIALS || "",
        });
      }
    }
  }, [config, onConfigUpdate]);

  // update css vars of brand colours
  useEffect(() => {
    const colors = currentValues.brandColors.split(",");
    if (colors.length === 8) {
      document.documentElement.style.setProperty("--brand-1", `#${colors[0]}`);
      document.documentElement.style.setProperty("--brand-2", `#${colors[1]}`);
      document.documentElement.style.setProperty("--brand-3", `#${colors[2]}`);
      document.documentElement.style.setProperty("--brand-4", `#${colors[3]}`);
      document.documentElement.style.setProperty("--brand-5", `#${colors[4]}`);
      document.documentElement.style.setProperty("--brand-6", `#${colors[5]}`);
      document.documentElement.style.setProperty("--brand-7", `#${colors[6]}`);
      document.documentElement.style.setProperty("--brand-8", `#${colors[7]}`);
    } else {
      console.error("Invalid number of colors provided for brand colors");
    }
  }, [currentValues.brandColors]);

  if (!isActive) return null;

  const handleUrlBlur = (e: FocusEvent<HTMLInputElement>) => {
    const result = formatAndValidateUrl(e.target.value);

    setCurrentValues((prev) => ({
      ...prev,
      siteUrl: result.url,
    }));

    if (!result.isValid) {
      setUrlError(result.error || null);
    } else {
      setUrlError(null);
    }
  };

  const handleImageChange = async (id: string, base64: string, filename: string) => {
    try {
      if (!base64) {
        // Handle image removal
        setImages((prev) => {
          const newImages = { ...prev };
          delete newImages[id];
          return newImages;
        });
        onConfigUpdate({ [id]: "" });
        return;
      }
      setIsUploadingImages(true);
      setError(null);
      const response = await fetch("/api/fs/saveBrandImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: base64,
          filename,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to upload image");
      }
      const result = await response.json();
      if (result.success) {
        setImages((prev) => ({
          ...prev,
          [id]: base64,
        }));
        onConfigUpdate({ [id]: result.path });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploadingImages(false);
    }
  };

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

  const handleOpenGraphChange = (field: "title" | "author" | "description", value: string) => {
    const fieldMap = {
      title: "ogTitle",
      author: "ogAuthor",
      description: "ogDesc",
    };
    setCurrentValues((prev) => ({
      ...prev,
      [fieldMap[field]]: value,
    }));
  };

  const handleColorChange = (newValue: string) => {
    onConfigUpdate({ BRAND_COLOURS: newValue });
    setCurrentValues((prev) => ({ ...prev, brandColors: newValue }));
    setSelectedBrandPreset(`custom`);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isUploadingImages || isProcessing) {
      return;
    }
    setError(null);

    try {
      const updates = Object.entries(currentValues).reduce(
        (acc, [field, value]) => {
          const initialValue = initialValues[field as keyof BrandFormValues];
          if (value !== initialValue) {
            const configKey = fieldToConfigKey[field as keyof BrandFormValues];
            acc[configKey] = value;
          }
          return acc;
        },
        {} as Record<string, unknown>
      );
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
        <button
          onClick={onBack}
          className="text-mydarkgrey hover:text-myblue flex items-center"
          aria-label="Go back to previous step"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" aria-hidden="true" />
          Back
        </button>
        <h3 className="text-xl font-bold text-mydarkgrey">Brand Customization</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-myblue/5 rounded-lg">
        {error && <div className="p-4 bg-myred/10 text-myred rounded-md">{error}</div>}

        <div className="space-y-4">
          <div className="block">
            <div className="flex items-center justify-between">
              <label htmlFor="siteUrl" className="text-mydarkgrey font-bold">
                Site URL
              </label>
              {urlError && <span className="text-sm text-myred">{urlError}</span>}
            </div>
            <input
              id="siteUrl"
              name="siteUrl"
              type="url"
              value={currentValues.siteUrl}
              onChange={(e) => setCurrentValues((prev) => ({ ...prev, siteUrl: e.target.value }))}
              onBlur={handleUrlBlur}
              placeholder="https://example.com"
              className={`${commonInputClass} ${urlError ? "ring-myred/50" : ""}`}
              required
              aria-describedby={urlError ? "siteUrl-error" : undefined}
            />
            {urlError && (
              <span id="siteUrl-error" className="sr-only">
                {urlError}
              </span>
            )}
          </div>

          <div className="block">
            <label htmlFor="slogan" className="text-mydarkgrey font-bold">
              Slogan
            </label>
            <input
              id="slogan"
              name="slogan"
              type="text"
              value={currentValues.slogan}
              onChange={(e) => setCurrentValues((prev) => ({ ...prev, slogan: e.target.value }))}
              placeholder="Your company slogan"
              className={commonInputClass}
              required
            />
          </div>

          <div className="block">
            <label htmlFor="footer" className="text-mydarkgrey font-bold">
              Footer Text
            </label>
            <input
              id="footer"
              name="footer"
              type="text"
              value={currentValues.footer}
              onChange={(e) => setCurrentValues((prev) => ({ ...prev, footer: e.target.value }))}
              placeholder="Footer text"
              className={commonInputClass}
              required
            />
          </div>

          <div className="block">
            <label htmlFor="gtag" className="text-mydarkgrey font-bold">
              Google Analytics ID
            </label>
            <input
              id="gtag"
              name="gtag"
              type="text"
              value={currentValues.gtag}
              onChange={(e) => setCurrentValues((prev) => ({ ...prev, gtag: e.target.value }))}
              placeholder="G-XXXXXXXXXX"
              className={commonInputClass}
              aria-describedby="gtag-desc"
            />
            <span id="gtag-desc" className="text-sm text-mydarkgrey mt-1 block">
              Optional: Enter your Google Analytics 4 Measurement ID
            </span>
          </div>

          <div className="space-y-2">
            <label htmlFor="brandPreset" className="text-mydarkgrey font-bold block">
              Brand Colors
            </label>
            <div className="space-y-4">
              <Combobox value={selectedBrandPreset} onChange={handleBrandPresetChange}>
                <div className="relative max-w-xs">
                  <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-sm">
                    <Combobox.Input
                      id="brandPreset"
                      name="brandPreset"
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
                      aria-label="Select brand color preset"
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
                onChange={handleColorChange}
                onEditingChange={() => {}}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-myblue/10">
          <WordMarkMode
            value={currentValues.wordmarkMode}
            onChange={(mode) => setCurrentValues((prev) => ({ ...prev, wordmarkMode: mode }))}
          />
        </div>

        <div className="mt-8 pt-6 border-t border-myblue/10">
          <div className="space-y-2">
            <span className="block text-sm font-normal text-mydarkgrey">Theme</span>
            <ThemeVisualSelector
              value={currentValues.theme as Theme}
              onChange={(theme) => setCurrentValues((prev) => ({ ...prev, theme }))}
              brandString={currentValues.brandColors}
              config={config!}
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-myblue/10">
          <OpenGraphSettings
            title={currentValues.ogTitle}
            author={currentValues.ogAuthor}
            description={currentValues.ogDesc}
            onChange={handleOpenGraphChange}
          />
        </div>

        <div className="mt-8 pt-6 border-t border-myblue/10">
          <BrandImageUploads
            images={images}
            initialConfig={config}
            onImageChange={handleImageChange}
          />
        </div>

        <div className="mt-8 pt-6 border-t border-myblue/10">
          <SocialLinks
            value={currentValues.socialLinks}
            onChange={(value) => setCurrentValues((prev) => ({ ...prev, socialLinks: value }))}
          />
        </div>

        <div className="mt-8 pt-6 border-t border-myblue/10">
          <h3 className="text-lg font-bold text-mydarkgrey mb-4">Accessibility Settings</h3>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="keyboardAccessible"
              checked={currentValues.keyboardAccessible}
              onChange={(e) =>
                setCurrentValues((prev) => ({ ...prev, keyboardAccessible: e.target.checked }))
              }
              className="h-4 w-4 rounded border-mylightgrey text-myblue focus:ring-myblue"
            />
            <label htmlFor="keyboardAccessible" className="text-sm text-mydarkgrey">
              Enable Keyboard/Mouse Accessible Mode by Default
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-4 gap-x-4">
          <button
            type="submit"
            disabled={
              isProcessing ||
              !currentValues.siteUrl ||
              !currentValues.slogan ||
              !currentValues.footer
            }
            className="px-4 py-2 text-white bg-myblue rounded hover:bg-black disabled:bg-mylightgrey"
            aria-disabled={isProcessing}
          >
            {isProcessing ? "Saving..." : "Save and Continue"}
          </button>
          <a
            href="/storykeep"
            className="px-4 py-2 text-white bg-myblack rounded hover:bg-black disabled:bg-mylightgrey"
            role="button"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
