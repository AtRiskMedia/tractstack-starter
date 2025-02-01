import { useMemo } from "react";
import SelectedTailwindClass from "../fields/SelectedTailwindClass";
import { StylesMemory } from "../state/StylesMemory";
import { isMarkdownPaneFragmentNode } from "@/utils/nodes/type-guards";
import { tagTitles } from "@/constants";
import { settingsPanelStore } from "@/store/storykeep";
import type { Tag, FlatNode, MarkdownPaneFragmentNode } from "@/types";

interface StyleElementPanelProps {
  node: FlatNode;
  parentNode: MarkdownPaneFragmentNode;
}

const StyleElementPanel = ({ node, parentNode }: StyleElementPanelProps) => {
  if (!node?.tagName || !isMarkdownPaneFragmentNode(parentNode)) {
    return null;
  }

  const defaultClasses = parentNode.defaultClasses?.[node.tagName];
  const overrideClasses = node.overrideClasses;

  const mergedClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};

    // First add all default classes
    if (defaultClasses) {
      Object.keys(defaultClasses.mobile).forEach((className) => {
        result[className] = {
          mobile: defaultClasses.mobile[className],
          ...(defaultClasses.tablet && { tablet: defaultClasses.tablet[className] }),
          ...(defaultClasses.desktop && { desktop: defaultClasses.desktop[className] }),
        };
      });
    }

    // Then overlay any override classes
    if (overrideClasses) {
      ["mobile", "tablet", "desktop"].forEach((viewport) => {
        const viewportOverrides = overrideClasses[viewport as keyof typeof overrideClasses];
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
  }, [defaultClasses, overrideClasses]);

  const handleClickAdd = () => {
    settingsPanelStore.set({
      nodeId: node.id,
      action: `style-element-add`,
      expanded: true,
    });
  };

  const handleRemove = (className: string) => {
    settingsPanelStore.set({
      nodeId: node.id,
      className,
      action: `style-element-remove`,
      expanded: true,
    });
  };

  const handleUpdate = (className: string) => {
    settingsPanelStore.set({
      nodeId: node.id,
      className,
      action: `style-element-update`,
      expanded: true,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Style this {tagTitles[node.tagName as Tag]}</h2>

      {Object.keys(mergedClasses).length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {Object.entries(mergedClasses).map(([className, values]) => (
            <SelectedTailwindClass
              key={className}
              name={className}
              values={values}
              onRemove={handleRemove}
              onUpdate={handleUpdate}
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
              onClick={() => handleClickAdd()}
              className="text-myblue hover:text-black underline font-bold"
            >
              Add Style
            </button>
          </li>
          <li>
            <StylesMemory node={node} parentNode={parentNode} />
          </li>
        </ul>
      </div>
    </div>
  );
};

export default StyleElementPanel;
