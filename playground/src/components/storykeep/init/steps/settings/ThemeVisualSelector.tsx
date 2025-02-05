import { useState, useEffect } from "react";
import { NodesContext } from "@/store/nodes";
import { NodesSnapshotRenderer } from "@/utils/nodes/NodesSnapshotRenderer";
import { themes } from "@/constants";
import { getIntroSectionDefault } from "@/utils/designs/templateMarkdownStyles";
import { createEmptyStorykeep } from "@/utils/common/nodesHelper";
import type { Theme, Config } from "@/types";

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

export default function ThemeVisualSelector({
  value,
  onChange,
  config,
  brandString,
}: ThemeVisualSelectorProps) {
  const [lastBrandString, setLastBrandString] = useState(brandString);
  const [snapshots, setSnapshots] = useState<Record<Theme, string>>(() => {
    return themes.reduce(
      (acc, theme) => {
        acc[theme] = "";
        return acc;
      },
      {} as Record<Theme, string>
    );
  });
  const [contexts, setContexts] = useState<Record<Theme, NodesContext>>(() => {
    return themes.reduce(
      (acc, theme) => {
        const ctx = new NodesContext();
        ctx.addNode(createEmptyStorykeep("tmp"));
        const template = getIntroSectionDefault(theme, brandString, false, true);
        ctx.addTemplatePane("tmp", template);
        acc[theme] = ctx;
        return acc;
      },
      {} as Record<Theme, NodesContext>
    );
  });

  // Reset snapshots and recreate contexts when brand colors change
  useEffect(() => {
    if (lastBrandString !== brandString) {
      setSnapshots(() =>
        themes.reduce(
          (acc, theme) => {
            acc[theme] = "";
            return acc;
          },
          {} as Record<Theme, string>
        )
      );
      setLastBrandString(brandString);
      // Create new contexts with updated brand colors
      const newContexts: Record<Theme, NodesContext> = themes.reduce(
        (acc, theme) => {
          const ctx = new NodesContext();
          ctx.addNode(createEmptyStorykeep("tmp"));
          const template = getIntroSectionDefault(theme, brandString, false, true);
          ctx.addTemplatePane("tmp", template);
          acc[theme] = ctx;
          return acc;
        },
        {} as Record<Theme, NodesContext>
      );
      themes.forEach((theme) => {
        const ctx = new NodesContext();
        ctx.addNode(createEmptyStorykeep("tmp"));
        const template = getIntroSectionDefault(theme, brandString, false, true);
        ctx.addTemplatePane("tmp", template);
        newContexts[theme] = ctx;
      });
      setContexts(newContexts);
    }
  }, [brandString, lastBrandString]);

  // Initialize contexts on first render
  useEffect(() => {
    const initialContexts: Record<Theme, NodesContext> = themes.reduce(
      (acc, theme) => {
        acc[theme] = new NodesContext();
        return acc;
      },
      {} as Record<Theme, NodesContext>
    );
    themes.forEach((theme) => {
      const ctx = new NodesContext();
      ctx.addNode(createEmptyStorykeep("tmp"));
      const template = getIntroSectionDefault(theme, brandString, false, true);
      ctx.addTemplatePane("tmp", template);
      initialContexts[theme] = ctx;
    });
    setContexts(initialContexts);
  }, []);

  if (!config) {
    return null;
  }

  // Create config with current brandString
  const thisConfig = {
    ...config,
    init: {
      ...config.init,
      BRAND_COLOURS: brandString,
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {themes.map((theme) => {
        const ctx = contexts[theme];
        if (!ctx) return null;

        return (
          <button
            type="button"
            key={theme}
            onClick={() => onChange(theme)}
            className={`group relative rounded-lg transition-all hover:ring-2 hover:ring-myorange hover:ring-offset-2 ${
              value === theme ? "ring-2 ring-myorange ring-offset-2" : ""
            }`}
          >
            <div
              className="relative h-auto w-full"
              style={{
                minHeight: `200px`,
              }}
            >
              {!snapshots[theme] ? (
                <div className="absolute inset-0">
                  <NodesSnapshotRenderer
                    ctx={ctx}
                    config={thisConfig}
                    onComplete={(data) => {
                      setSnapshots((prev) => ({
                        ...prev,
                        [theme]: data.imageData,
                      }));
                    }}
                    forceRegenerate={!snapshots[theme]}
                  />
                </div>
              ) : (
                <img
                  src={snapshots[theme]}
                  alt={`${themeNames[theme]} theme preview`}
                  className="w-full h-full object-contain object-top rounded-lg"
                />
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
