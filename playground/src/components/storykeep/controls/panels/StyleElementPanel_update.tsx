import { useState, useCallback, useEffect } from "react";
import {
  styleElementInfoStore,
  resetStyleElementInfo,
  settingsPanelStore,
} from "@/store/storykeep";
import ViewportComboBox from "../fields/ViewportComboBox";
import { tailwindClasses } from "@/utils/tailwind/tailwindClasses";
import { getCtx } from "@/store/nodes";
import { isMarkdownPaneFragmentNode } from "@/utils/nodes/type-guards";
import { cloneDeep } from "@/utils/common/helpers.ts";
import type { BasePanelProps } from "../SettingsPanel";
import type { FlatNode, MarkdownPaneFragmentNode } from "@/types";

const StyleElementUpdatePanel = ({ node, parentNode, className, config }: BasePanelProps) => {
  if (!node || !className || !parentNode || !isMarkdownPaneFragmentNode(parentNode)) return null;

  const [isOverridden, setIsOverridden] = useState(false);
  const [mobileValue, setMobileValue] = useState<string>(``);
  const [tabletValue, setTabletValue] = useState<string>(``);
  const [desktopValue, setDesktopValue] = useState<string>(``);
  const [pendingUpdate, setPendingUpdate] = useState<{
    value: string;
    viewport: "mobile" | "tablet" | "desktop";
  } | null>(null);

  const friendlyName = tailwindClasses[className]?.title || className;
  const values = tailwindClasses[className]?.values || [];

  const resetStore = () => {
    if (node?.id)
      settingsPanelStore.set({
        nodeId: node.id,
        action: `style-element`,
        expanded: true,
      });
  };

  // Initialize values from current node state
  useEffect(() => {
    const hasOverride = node.overrideClasses?.mobile?.[className] !== undefined;
    setIsOverridden(hasOverride);

    styleElementInfoStore.set({
      markdownParentId: parentNode.id,
      tagName: node.tagName,
      overrideNodeId: hasOverride ? node.id : null,
      className: className,
    });

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

  // Effect to handle style updates after state changes
  useEffect(() => {
    if (!pendingUpdate) return;

    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();

    if (isOverridden) {
      // Update override classes
      const elementNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
      if (!elementNode) return;

      const newOverrides = {
        mobile: { ...(elementNode.overrideClasses?.mobile || {}) },
        tablet: { ...(elementNode.overrideClasses?.tablet || {}) },
        desktop: { ...(elementNode.overrideClasses?.desktop || {}) },
      };

      newOverrides[pendingUpdate.viewport][className] = pendingUpdate.value;
      elementNode.overrideClasses = newOverrides;

      switch (pendingUpdate.viewport) {
        case "mobile":
          setMobileValue(pendingUpdate.value);
          break;
        case "tablet":
          setTabletValue(pendingUpdate.value);
          break;
        case "desktop":
          setDesktopValue(pendingUpdate.value);
          break;
      }

      ctx.modifyNodes([{ ...elementNode, isChanged: true }]);
    } else {
      // Update default classes
      const markdownNode = cloneDeep(allNodes.get(parentNode.id)) as MarkdownPaneFragmentNode;
      if (!markdownNode?.defaultClasses) {
        markdownNode.defaultClasses = {};
      }

      if (!markdownNode.defaultClasses[node.tagName]) {
        markdownNode.defaultClasses[node.tagName] = {
          mobile: {},
          tablet: {},
          desktop: {},
        };
      }

      const defaults = markdownNode.defaultClasses[node.tagName];

      if (pendingUpdate.viewport !== "mobile") {
        defaults[pendingUpdate.viewport] = defaults[pendingUpdate.viewport] || {};
      }

      defaults[pendingUpdate.viewport][className] = pendingUpdate.value;

      switch (pendingUpdate.viewport) {
        case "mobile":
          setMobileValue(pendingUpdate.value);
          break;
        case "tablet":
          setTabletValue(pendingUpdate.value);
          break;
        case "desktop":
          setDesktopValue(pendingUpdate.value);
          break;
      }

      ctx.modifyNodes([{ ...markdownNode, isChanged: true }]);
    }

    setPendingUpdate(null);
  }, [pendingUpdate, isOverridden, node, parentNode, className]);

  const handleToggleOverride = useCallback(
    (checked: boolean) => {
      styleElementInfoStore.setKey("overrideNodeId", checked ? node.id : null);
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();
      const elementNode = allNodes.get(node.id) as FlatNode;

      if (!elementNode) return;

      if (checked) {
        // When toggling ON override mode:
        // 1. Create empty override structure
        const newOverrides = {
          mobile: { ...(elementNode.overrideClasses?.mobile || {}) },
          tablet: { ...(elementNode.overrideClasses?.tablet || {}) },
          desktop: { ...(elementNode.overrideClasses?.desktop || {}) },
        };

        // 2. Initialize with current values from default classes if they exist
        const defaults = parentNode.defaultClasses?.[node.tagName];
        if (defaults) {
          newOverrides.mobile[className] = defaults.mobile[className] || "";
          newOverrides.tablet[className] = defaults.tablet?.[className] || "";
          newOverrides.desktop[className] = defaults.desktop?.[className] || "";
        } else {
          newOverrides.mobile[className] = "";
          newOverrides.tablet[className] = "";
          newOverrides.desktop[className] = "";
        }

        elementNode.overrideClasses = newOverrides;

        setMobileValue(newOverrides.mobile[className]);
        setTabletValue(newOverrides.tablet[className]);
        setDesktopValue(newOverrides.desktop[className]);
      } else {
        // When toggling OFF override mode:
        if (elementNode.overrideClasses) {
          const mobileClasses = { ...(elementNode.overrideClasses.mobile || {}) };
          const tabletClasses = { ...(elementNode.overrideClasses.tablet || {}) };
          const desktopClasses = { ...(elementNode.overrideClasses.desktop || {}) };

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

        // Reset to default values
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
    (value: string, viewport: "mobile" | "tablet" | "desktop") => {
      setPendingUpdate({ value, viewport });
    },
    []
  );

  useEffect(() => {
    return () => {
      resetStyleElementInfo();
    };
  }, []);

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
