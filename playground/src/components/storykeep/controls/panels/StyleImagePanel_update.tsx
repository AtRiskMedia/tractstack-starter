import { useState, useCallback, useEffect } from "react";
import { settingsPanelStore } from "@/store/storykeep";
import ViewportComboBox from "../fields/ViewportComboBox";
import { tailwindClasses } from "@/utils/tailwind/tailwindClasses";
import { getCtx } from "@/store/nodes";
import type { BasePanelProps } from "../SettingsPanel";
import type { FlatNode, MarkdownPaneFragmentNode } from "@/types";
import { isMarkdownPaneFragmentNode } from "@/utils/nodes/type-guards";
import { cloneDeep } from "@/utils/common/helpers.ts";

const StyleImageUpdatePanel = ({
  node,
  parentNode,
  className,
  config,
  childId,
}: BasePanelProps) => {
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
  const isOuterContainer = node.tagName === "ul" || node.tagName === "ol";
  const isContainer = node.tagName === "li";
  const isImage = node.tagName === "img";
  const elementTypeTitle = isOuterContainer
    ? "Outer Container"
    : isContainer
      ? "Container"
      : "Image";

  const resetStore = () => {
    settingsPanelStore.set({
      action: "style-image",
      nodeId: isOuterContainer || isContainer ? childId || node.id : node.id,
      expanded: true,
    });
  };

  // Initialize values from current node state
  useEffect(() => {
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const targetNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
    if (!targetNode) return;

    const hasOverride = targetNode.overrideClasses?.mobile?.[className] !== undefined;
    setIsOverridden(hasOverride);

    const defaults = parentNode.defaultClasses?.[targetNode.tagName];

    if (hasOverride && targetNode.overrideClasses?.mobile?.[className] !== undefined) {
      setMobileValue(targetNode.overrideClasses.mobile[className]);
      setTabletValue(targetNode.overrideClasses.tablet?.[className] ?? "");
      setDesktopValue(targetNode.overrideClasses.desktop?.[className] ?? "");
    } else if (defaults) {
      setMobileValue(defaults.mobile[className] || "");
      setTabletValue(defaults.tablet?.[className] || "");
      setDesktopValue(defaults.desktop?.[className] || "");
    }
  }, [node, parentNode, className, childId, isImage]);

  // Handle updates after state changes
  useEffect(() => {
    if (!pendingUpdate) return;

    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();

    if (isOverridden) {
      // Get the correct target node based on what we're styling
      const targetNodeId = node.id;
      const targetNode = cloneDeep(allNodes.get(targetNodeId)) as FlatNode;

      if (!targetNode) return;

      const newOverrides = {
        mobile: { ...(targetNode.overrideClasses?.mobile || {}) },
        tablet: { ...(targetNode.overrideClasses?.tablet || {}) },
        desktop: { ...(targetNode.overrideClasses?.desktop || {}) },
      };

      newOverrides[pendingUpdate.viewport][className] = pendingUpdate.value;
      targetNode.overrideClasses = newOverrides;

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

      ctx.modifyNodes([{ ...targetNode, isChanged: true }]);
    } else {
      const markdownNode = cloneDeep(allNodes.get(parentNode.id)) as MarkdownPaneFragmentNode;
      if (!markdownNode?.defaultClasses) {
        markdownNode.defaultClasses = {};
      }

      // Use the actual target node's tagName
      const targetTagName = node.tagName;

      // Initialize defaultClasses for this tagName if needed
      if (!markdownNode.defaultClasses[targetTagName]) {
        markdownNode.defaultClasses[targetTagName] = {
          mobile: {},
          tablet: {},
          desktop: {},
        };
      }

      // Add style to the correct tagName
      markdownNode.defaultClasses[targetTagName][pendingUpdate.viewport][className] =
        pendingUpdate.value;

      // Update state values
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
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();

      // Get the correct target node based on what we're styling
      const targetNodeId = isImage ? node.id : childId || node.id;
      const targetNode = cloneDeep(allNodes.get(targetNodeId)) as FlatNode;

      if (!targetNode) return;

      if (checked) {
        // When toggling ON override mode
        const newOverrides = {
          mobile: { ...(targetNode.overrideClasses?.mobile || {}) },
          tablet: { ...(targetNode.overrideClasses?.tablet || {}) },
          desktop: { ...(targetNode.overrideClasses?.desktop || {}) },
        };

        // Initialize with current values from default classes if they exist
        const defaults = parentNode.defaultClasses?.[targetNode.tagName];
        if (defaults) {
          newOverrides.mobile[className] = defaults.mobile[className] || "";
          newOverrides.tablet[className] = defaults.tablet?.[className] || "";
          newOverrides.desktop[className] = defaults.desktop?.[className] || "";
        } else {
          newOverrides.mobile[className] = "";
          newOverrides.tablet[className] = "";
          newOverrides.desktop[className] = "";
        }

        targetNode.overrideClasses = newOverrides;

        setMobileValue(newOverrides.mobile[className]);
        setTabletValue(newOverrides.tablet[className]);
        setDesktopValue(newOverrides.desktop[className]);
      } else {
        // When toggling OFF override mode
        if (targetNode.overrideClasses) {
          const mobileClasses = { ...(targetNode.overrideClasses.mobile || {}) };
          const tabletClasses = { ...(targetNode.overrideClasses.tablet || {}) };
          const desktopClasses = { ...(targetNode.overrideClasses.desktop || {}) };

          delete mobileClasses[className];
          delete tabletClasses[className];
          delete desktopClasses[className];

          const hasClasses =
            Object.keys(mobileClasses).length > 0 ||
            Object.keys(tabletClasses).length > 0 ||
            Object.keys(desktopClasses).length > 0;

          targetNode.overrideClasses = hasClasses
            ? { mobile: mobileClasses, tablet: tabletClasses, desktop: desktopClasses }
            : undefined;
        }

        // Reset to default values
        const defaults = parentNode.defaultClasses?.[targetNode.tagName];
        if (defaults) {
          setMobileValue(defaults.mobile[className] || "");
          setTabletValue(defaults.tablet?.[className] || "");
          setDesktopValue(defaults.desktop?.[className] || "");
        }
      }

      ctx.modifyNodes([{ ...targetNode, isChanged: true }]);
      setIsOverridden(checked);
    },
    [node, className, parentNode, childId, isImage]
  );

  const handleFinalChange = useCallback(
    (value: string, viewport: "mobile" | "tablet" | "desktop") => {
      setPendingUpdate({ value, viewport });
    },
    []
  );

  return (
    <div className="space-y-4 z-50 isolate">
      <div className="flex flex-row flex-nowrap justify-between">
        <h2 className="text-xl font-bold">
          {friendlyName} ({elementTypeTitle})
        </h2>
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

export default StyleImageUpdatePanel;
