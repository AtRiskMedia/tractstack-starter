import { useState, useCallback, useEffect } from "react";
import { settingsPanelStore } from "@/store/storykeep";
import ViewportComboBox from "../fields/ViewportComboBox";
import { tailwindClasses } from "../../../../utils/tailwind/tailwindClasses";
import { getCtx } from "../../../../store/nodes";
import type { BasePanelProps } from "../SettingsPanel";
import type { FlatNode, MarkdownPaneFragmentNode } from "../../../../types";
import { isMarkdownPaneFragmentNode } from "../../../../utils/nodes/type-guards";
import { cloneDeep } from "@/utils/common/helpers.ts";

type ViewportOverrides = {
  mobile: Record<string, string>;
  tablet: Record<string, string>;
  desktop: Record<string, string>;
};

type Viewport = "mobile" | "tablet" | "desktop";

const StyleElementUpdatePanel = ({ node, parentNode, className, config }: BasePanelProps) => {
  console.log(node, parentNode, className);
  if (!node || !className || !parentNode || !isMarkdownPaneFragmentNode(parentNode)) return null;

  const [isOverridden, setIsOverridden] = useState(false);
  const [mobileValue, setMobileValue] = useState<string>(``);
  const [tabletValue, setTabletValue] = useState<string>(``);
  const [desktopValue, setDesktopValue] = useState<string>(``);

  const friendlyName = tailwindClasses[className]?.title || className;
  const values = tailwindClasses[className]?.values || [];

  const resetStore = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: `style-element`,
    });
  };

  useEffect(() => {
    const hasOverride = node.overrideClasses?.mobile?.[className] !== undefined;
    setIsOverridden(hasOverride);

    const defaults = parentNode.defaultClasses?.[node.tagName];

    if (hasOverride && node.overrideClasses?.mobile?.[className] !== undefined) {
      setMobileValue(node.overrideClasses.mobile[className]);
      setTabletValue(node.overrideClasses.tablet?.[className] ?? "");
      setDesktopValue(node.overrideClasses.desktop?.[className] ?? "");
    } else if (defaults) {
      setMobileValue(defaults.mobile[className] || "");
      setTabletValue(defaults.tablet?.[className] || "");
      setDesktopValue(defaults.desktop?.[className] || "");
    }
  }, [node, parentNode, className]);

  const handleToggleOverride = useCallback(
    (checked: boolean) => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();
      const elementNode = cloneDeep(allNodes.get(node.id)) as FlatNode;

      if (!elementNode) return;

      if (checked) {
        // When toggling ON override mode:
        // 1. Create empty override structure
        const newOverrides: ViewportOverrides = {
          mobile: {},
          tablet: {},
          desktop: {},
        };
        // 2. Set empty values for this className
        newOverrides.mobile[className] = "";
        newOverrides.tablet[className] = "";
        newOverrides.desktop[className] = "";
        elementNode.overrideClasses = newOverrides;
        setMobileValue("");
        setTabletValue("");
        setDesktopValue("");
      } else {
        // When toggling OFF override mode:
        // 1. Remove this className from overrides
        if (elementNode.overrideClasses) {
          const mobileClasses = { ...(elementNode.overrideClasses?.mobile ?? {}) };
          const tabletClasses = { ...(elementNode.overrideClasses?.tablet ?? {}) };
          const desktopClasses = { ...(elementNode.overrideClasses?.desktop ?? {}) };

          delete mobileClasses[className];
          delete tabletClasses[className];
          delete desktopClasses[className];

          const hasClasses =
            Object.keys(mobileClasses).length > 0 ||
            Object.keys(tabletClasses).length > 0 ||
            Object.keys(desktopClasses).length > 0;

          elementNode.overrideClasses = hasClasses
            ? { mobile: mobileClasses, tablet: tabletClasses, desktop: desktopClasses }
            : undefined;
        }
        // 2. Reset values to parent's defaultClasses
        const defaults = parentNode.defaultClasses?.[node.tagName];
        if (defaults) {
          setMobileValue(defaults.mobile[className] || "");
          setTabletValue(defaults.tablet?.[className] || "");
          setDesktopValue(defaults.desktop?.[className] || "");
        }
      }

      ctx.modifyNodes([{ ...elementNode, isChanged: true }]);
      setIsOverridden(checked);
    },
    [node, className, parentNode]
  );

  const handleFinalChange = useCallback(
    (value: string, viewport: Viewport) => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();

      if (isOverridden) {
        const elementNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
        if (!elementNode) return;

        const newOverrides: ViewportOverrides = {
          mobile: { ...(elementNode.overrideClasses?.mobile ?? {}) },
          tablet: { ...(elementNode.overrideClasses?.tablet ?? {}) },
          desktop: { ...(elementNode.overrideClasses?.desktop ?? {}) },
        };

        newOverrides[viewport][className] = value;
        elementNode.overrideClasses = newOverrides;

        switch (viewport) {
          case "mobile":
            setMobileValue(value);
            break;
          case "tablet":
            setTabletValue(value);
            break;
          case "desktop":
            setDesktopValue(value);
            break;
        }

        ctx.modifyNodes([{ ...elementNode, isChanged: true }]);
      } else {
        const markdownNode = cloneDeep(allNodes.get(parentNode.id)) as MarkdownPaneFragmentNode;
        if (!markdownNode) return;

        // Initialize defaultClasses structure if it doesn't exist
        if (!markdownNode.defaultClasses) {
          markdownNode.defaultClasses = {};
        }

        // Initialize tag structure if it doesn't exist
        if (!markdownNode.defaultClasses[node.tagName]) {
          markdownNode.defaultClasses[node.tagName] = {
            mobile: {},
            tablet: {},
            desktop: {},
          };
        }

        const defaults = markdownNode.defaultClasses[node.tagName];

        // Ensure viewport objects exist
        if (viewport !== "mobile") {
          defaults[viewport] = defaults[viewport] || {};
        }

        defaults[viewport][className] = value;

        switch (viewport) {
          case "mobile":
            setMobileValue(value);
            break;
          case "tablet":
            setTabletValue(value);
            break;
          case "desktop":
            setDesktopValue(value);
            break;
        }

        ctx.modifyNodes([{ ...markdownNode, isChanged: true }]);
      }
    },
    [node, parentNode, className, isOverridden]
  );

  return (
    <div className="space-y-4 z-50 isolate">
      <div className="flex flex-row flex-nowrap justify-between">
        <h2 className="text-xl font-bold">{friendlyName}</h2>
        <button
          className="text-myblue hover:text-black"
          title="Return to preview pane"
          onClick={resetStore}
        >
          Go Back
        </button>
      </div>

      <div className="flex items-center space-x-2 py-2">
        <input
          type="checkbox"
          checked={isOverridden}
          onChange={(e) => handleToggleOverride(e.target.checked)}
          className="h-4 w-4 text-myorange focus:ring-myorange border-mydarkgrey rounded"
        />
        <span className="text-sm text-mydarkgrey">
          {isOverridden
            ? "Override mode. Styling this element only."
            : "You are in quick styles mode. Click to override this element."}
        </span>
      </div>

      <div className="flex flex-col gap-y-2.5 my-3 text-mydarkgrey text-xl">
        <ViewportComboBox
          value={mobileValue}
          onFinalChange={handleFinalChange}
          values={values}
          viewport="mobile"
          config={config!}
          isInferred={false}
        />
        <ViewportComboBox
          value={tabletValue}
          onFinalChange={handleFinalChange}
          values={values}
          viewport="tablet"
          isInferred={!isOverridden && tabletValue === mobileValue}
          config={config!}
        />
        <ViewportComboBox
          value={desktopValue}
          onFinalChange={handleFinalChange}
          values={values}
          viewport="desktop"
          isInferred={!isOverridden && desktopValue === tabletValue}
          config={config!}
        />
      </div>
    </div>
  );
};

export default StyleElementUpdatePanel;
