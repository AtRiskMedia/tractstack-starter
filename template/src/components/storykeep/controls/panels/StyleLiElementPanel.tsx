import { useMemo } from "react";
import SelectedTailwindClass from "../fields/SelectedTailwindClass";
import { isMarkdownPaneFragmentNode } from "../../../../utils/nodes/type-guards";
import { tagTitles } from "../../../../constants";
import { settingsPanelStore } from "@/store/storykeep";
import type { Tag, FlatNode, MarkdownPaneFragmentNode } from "../../../../types";

interface StyleLiElementPanelProps {
  node: FlatNode;
  outerContainerNode: FlatNode;
  parentNode: MarkdownPaneFragmentNode;
}

const StyleLiElementPanel = ({
  node,
  outerContainerNode,
  parentNode,
}: StyleLiElementPanelProps) => {
  if (!node?.tagName || !outerContainerNode?.tagName || !isMarkdownPaneFragmentNode(parentNode)) {
    return null;
  }
  const liDefaultClasses = parentNode.defaultClasses?.[node.tagName];
  const liOverrideClasses = node.overrideClasses;
  const containerDefaultClasses = parentNode.defaultClasses?.[outerContainerNode.tagName];
  const containerOverrideClasses = outerContainerNode.overrideClasses;

  const mergedLiClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};
    // First add all default classes
    if (liDefaultClasses) {
      Object.keys(liDefaultClasses.mobile).forEach((className) => {
        result[className] = {
          mobile: liDefaultClasses.mobile[className],
          ...(liDefaultClasses.tablet && { tablet: liDefaultClasses.tablet[className] }),
          ...(liDefaultClasses.desktop && { desktop: liDefaultClasses.desktop[className] }),
        };
      });
    }
    // Then overlay any override classes
    if (liOverrideClasses) {
      ["mobile", "tablet", "desktop"].forEach((viewport) => {
        const viewportOverrides = liOverrideClasses[viewport as keyof typeof liOverrideClasses];
        if (viewportOverrides) {
          Object.entries(viewportOverrides).forEach(([className, value]) => {
            if (!result[className]) {
              result[className] = { mobile: value };
            } else {
              result[className] = {
                ...result[className],
                [viewport]: value,
              };
            }
          });
        }
      });
    }
    return result;
  }, [liDefaultClasses, liOverrideClasses]);

  const mergedContainerClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};
    // First add all default classes
    if (containerDefaultClasses) {
      Object.keys(containerDefaultClasses.mobile).forEach((className) => {
        result[className] = {
          mobile: containerDefaultClasses.mobile[className],
          ...(containerDefaultClasses.tablet && {
            tablet: containerDefaultClasses.tablet[className],
          }),
          ...(containerDefaultClasses.desktop && {
            desktop: containerDefaultClasses.desktop[className],
          }),
        };
      });
    }
    // Then overlay any override classes
    if (containerOverrideClasses) {
      ["mobile", "tablet", "desktop"].forEach((viewport) => {
        const viewportOverrides =
          containerOverrideClasses[viewport as keyof typeof containerOverrideClasses];
        if (viewportOverrides) {
          Object.entries(viewportOverrides).forEach(([className, value]) => {
            if (!result[className]) {
              result[className] = { mobile: value };
            } else {
              result[className] = {
                ...result[className],
                [viewport]: value,
              };
            }
          });
        }
      });
    }
    return result;
  }, [containerDefaultClasses, containerOverrideClasses]);

  const handleLiAdd = () => {
    settingsPanelStore.set({
      action: `style-li-element-add`,
      nodeId: node.id,
    });
  };

  const handleContainerAdd = () => {
    settingsPanelStore.set({
      action: `style-li-container-add`,
      nodeId: outerContainerNode.id,
      childId: node.id,
    });
  };

  const handleLiRemove = (className: string) => {
    settingsPanelStore.set({
      action: `style-li-element-remove`,
      nodeId: node.id,
      className,
    });
  };

  const handleContainerRemove = (className: string) => {
    settingsPanelStore.set({
      action: `style-li-container-remove`,
      nodeId: outerContainerNode.id,
      childId: node.id,
      className,
    });
  };

  const handleLiUpdate = (className: string) => {
    settingsPanelStore.set({
      action: `style-li-element-update`,
      nodeId: node.id,
      className,
    });
  };

  const handleContainerUpdate = (className: string) => {
    settingsPanelStore.set({
      action: `style-li-container-update`,
      nodeId: outerContainerNode.id,
      childId: node.id,
      className,
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Style this {tagTitles[node.tagName as Tag]}</h2>

        {Object.keys(mergedLiClasses).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(mergedLiClasses).map(([className, values]) => (
              <SelectedTailwindClass
                key={className}
                name={className}
                values={values}
                onRemove={handleLiRemove}
                onUpdate={handleLiUpdate}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <em>No styles.</em>
          </div>
        )}

        <div className="space-y-4">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-mydarkgrey">
            <li>
              <em>Actions:</em>
            </li>
            <li>
              <button
                onClick={handleLiAdd}
                className="text-myblue hover:text-black underline font-bold"
              >
                Add Style
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold">Container Styles</h3>

        {Object.keys(mergedContainerClasses).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(mergedContainerClasses).map(([className, values]) => (
              <SelectedTailwindClass
                key={className}
                name={className}
                values={values}
                onRemove={handleContainerRemove}
                onUpdate={handleContainerUpdate}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <em>No styles.</em>
          </div>
        )}

        <div className="space-y-4">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-mydarkgrey">
            <li>
              <em>Actions:</em>
            </li>
            <li>
              <button
                onClick={handleContainerAdd}
                className="text-myblue hover:text-black underline font-bold"
              >
                Add Style
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StyleLiElementPanel;
