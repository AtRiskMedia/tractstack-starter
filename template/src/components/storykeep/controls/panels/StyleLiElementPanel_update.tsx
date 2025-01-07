import { useState, useCallback, useEffect } from "react";
import { settingsPanelStore } from "@/store/storykeep";
import ViewportComboBox from "../fields/ViewportComboBox";
import { tailwindClasses } from "../../../../utils/tailwind/tailwindClasses";
import { getCtx } from "../../../../store/nodes";
import type { BasePanelProps } from "../SettingsPanel";
import type { FlatNode, MarkdownPaneFragmentNode } from "../../../../types";
import { isMarkdownPaneFragmentNode } from "../../../../utils/nodes/type-guards";
import { cloneDeep } from "@/utils/common/helpers.ts";

const StyleLiElementUpdatePanel = ({
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

  const friendlyName = tailwindClasses[className]?.title || className;
  const values = tailwindClasses[className]?.values || [];
  const isContainer = node.tagName === "ul" || node.tagName === "ol";

  const resetStore = () => {
    settingsPanelStore.set({
      action: "style-li-element",
      nodeId: isContainer && typeof childId === `string` ? childId : node.id,
    });
  };

  // Initialize values from current node state
  useEffect(() => {
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();

    // Get the correct target node based on whether we're styling container or list item
    const targetNodeId = isContainer ? node.id : childId || node.id;
    const targetNode = allNodes.get(targetNodeId) as FlatNode;

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
  }, [node, parentNode, className, childId, isContainer]);

  const handleToggleOverride = useCallback(
    (checked: boolean) => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();

      // Get the correct target node based on whether we're styling container or list item
      const targetNodeId = isContainer ? node.id : childId || node.id;
      const targetNode = allNodes.get(targetNodeId) as FlatNode;

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

      const newNodes = new Map(allNodes);
      newNodes.set(targetNodeId, { ...targetNode, isChanged: true });
      ctx.allNodes.set(newNodes);

      setIsOverridden(checked);

      if (parentNode.id) {
        ctx.notifyNode(parentNode.id);
      }
    },
    [node, className, parentNode, childId, isContainer]
  );

  const handleFinalChange = useCallback(
    (value: string, viewport: "mobile" | "tablet" | "desktop") => {
      const ctx = getCtx();
      const allNodes = ctx.allNodes.get();

      // Get the correct target node based on whether we're styling container or list item
      const targetNodeId = isContainer ? node.id : childId || node.id;
      const targetNode = cloneDeep(allNodes.get(targetNodeId)) as FlatNode;

      if (!targetNode) return;

      if (isOverridden) {
        // Update override classes
        const newOverrides = {
          mobile: { ...(targetNode.overrideClasses?.mobile || {}) },
          tablet: { ...(targetNode.overrideClasses?.tablet || {}) },
          desktop: { ...(targetNode.overrideClasses?.desktop || {}) },
        };

        newOverrides[viewport][className] = value;
        targetNode.overrideClasses = newOverrides;

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

        ctx.modifyNodes([{...targetNode, isChanged: true}]);
      } else {
        // Update default classes
        const markdownNode = cloneDeep(allNodes.get(parentNode.id) as MarkdownPaneFragmentNode);
        if (!markdownNode?.defaultClasses?.[targetNode.tagName]) {
          // Initialize defaultClasses structure if it doesn't exist
          if (!markdownNode.defaultClasses) {
            markdownNode.defaultClasses = {};
          }
          markdownNode.defaultClasses[targetNode.tagName] = {
            mobile: {},
            tablet: {},
            desktop: {},
          };
        }

        const defaults = markdownNode.defaultClasses[targetNode.tagName];

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

        ctx.modifyNodes([{...markdownNode, isChanged: true}]);
      }
    },
    [node, parentNode, className, isOverridden, childId, isContainer]
  );

  return (
    <div className="space-y-4 z-50 isolate">
      <div className="flex flex-row flex-nowrap justify-between">
        <h2 className="text-xl font-bold">
          {friendlyName} ({isContainer ? "Container" : "List Item"})
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

export default StyleLiElementUpdatePanel;
