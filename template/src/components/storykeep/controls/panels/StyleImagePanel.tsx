import { useMemo, useState } from "react";
import SelectedTailwindClass from "../fields/SelectedTailwindClass";
import { getCtx } from "../../../../store/nodes";
import { isMarkdownPaneFragmentNode } from "../../../../utils/nodes/type-guards";
import { tagTitles } from "../../../../constants";
import { settingsPanelStore } from "@/store/storykeep";
import type { Tag, FlatNode, MarkdownPaneFragmentNode } from "../../../../types";
import { cloneDeep } from "@/utils/common/helpers.ts";

interface StyleImagePanelProps {
  node: FlatNode;
  containerNode: FlatNode;
  outerContainerNode: FlatNode;
  parentNode: MarkdownPaneFragmentNode;
}

const StyleImagePanel = ({
  node,
  containerNode,
  outerContainerNode,
  parentNode,
}: StyleImagePanelProps) => {
  const [altDescription, setAltDescription] = useState(node.alt || "");
  if (
    !node?.tagName ||
    !containerNode?.tagName ||
    !outerContainerNode?.tagName ||
    !isMarkdownPaneFragmentNode(parentNode)
  ) {
    return null;
  }
  const imgDefaultClasses = parentNode.defaultClasses?.[node.tagName];
  const imgOverrideClasses = node.overrideClasses;
  const containerDefaultClasses = parentNode.defaultClasses?.[containerNode.tagName];
  const containerOverrideClasses = containerNode.overrideClasses;
  const outerDefaultClasses = parentNode.defaultClasses?.[outerContainerNode.tagName];
  const outerOverrideClasses = outerContainerNode.overrideClasses;

  // Merge classes for image
  const mergedImgClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};

    // Add default classes
    if (imgDefaultClasses) {
      Object.keys(imgDefaultClasses.mobile).forEach((className) => {
        result[className] = {
          mobile: imgDefaultClasses.mobile[className],
          ...(imgDefaultClasses.tablet && { tablet: imgDefaultClasses.tablet[className] }),
          ...(imgDefaultClasses.desktop && { desktop: imgDefaultClasses.desktop[className] }),
        };
      });
    }

    // Add override classes
    if (imgOverrideClasses) {
      ["mobile", "tablet", "desktop"].forEach((viewport) => {
        const viewportOverrides = imgOverrideClasses[viewport as keyof typeof imgOverrideClasses];
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
  }, [imgDefaultClasses, imgOverrideClasses]);

  // Merge classes for container
  const mergedContainerClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};

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

  // Merge classes for outer container
  const mergedOuterClasses = useMemo(() => {
    const result: {
      [key: string]: {
        mobile: string;
        tablet?: string;
        desktop?: string;
      };
    } = {};

    if (outerDefaultClasses) {
      Object.keys(outerDefaultClasses.mobile).forEach((className) => {
        result[className] = {
          mobile: outerDefaultClasses.mobile[className],
          ...(outerDefaultClasses.tablet && {
            tablet: outerDefaultClasses.tablet[className],
          }),
          ...(outerDefaultClasses.desktop && {
            desktop: outerDefaultClasses.desktop[className],
          }),
        };
      });
    }

    if (outerOverrideClasses) {
      ["mobile", "tablet", "desktop"].forEach((viewport) => {
        const viewportOverrides =
          outerOverrideClasses[viewport as keyof typeof outerOverrideClasses];
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
  }, [outerDefaultClasses, outerOverrideClasses]);

  const handleImgAdd = () => {
    settingsPanelStore.set({
      action: `style-img-add`,
      nodeId: node.id,
    });
  };

  const handleContainerAdd = () => {
    settingsPanelStore.set({
      action: `style-img-container-add`,
      nodeId: containerNode.id,
      childId: node.id,
    });
  };

  const handleOuterAdd = () => {
    settingsPanelStore.set({
      action: `style-img-outer-add`,
      nodeId: outerContainerNode.id,
      childId: node.id,
    });
  };

  const handleImgRemove = (className: string) => {
    settingsPanelStore.set({
      action: `style-img-remove`,
      nodeId: node.id,
      className,
    });
  };

  const handleContainerRemove = (className: string) => {
    settingsPanelStore.set({
      action: `style-img-container-remove`,
      nodeId: containerNode.id,
      childId: node.id,
      className,
    });
  };

  const handleOuterRemove = (className: string) => {
    settingsPanelStore.set({
      action: `style-img-outer-remove`,
      nodeId: outerContainerNode.id,
      childId: node.id,
      className,
    });
  };

  const handleImgUpdate = (className: string) => {
    settingsPanelStore.set({
      action: `style-img-update`,
      nodeId: node.id,
      className,
    });
  };

  const handleContainerUpdate = (className: string) => {
    settingsPanelStore.set({
      action: `style-img-container-update`,
      nodeId: containerNode.id,
      childId: node.id,
      className,
    });
  };

  const handleOuterUpdate = (className: string) => {
    settingsPanelStore.set({
      action: `style-img-outer-update`,
      nodeId: outerContainerNode.id,
      childId: node.id,
      className,
    });
  };

  const handleAltUpdate = (newAlt: string) => {
    const ctx = getCtx();
    const allNodes = ctx.allNodes.get();
    const imgNode = cloneDeep(allNodes.get(node.id)) as FlatNode;
    if (!imgNode) return;

    imgNode.alt = newAlt;
    ctx.modifyNodes([{...imgNode, isChanged: true}]);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Style this {tagTitles[node.tagName as Tag]}</h2>

        <div className="space-y-4">
          <label className="block text-sm text-mydarkgrey">Alt Description</label>
          <input
            type="text"
            value={altDescription}
            onChange={(e) => setAltDescription(e.target.value)}
            onBlur={(e) => handleAltUpdate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className="w-full border-mydarkgrey rounded-md py-2 pl-3 text-base"
            placeholder="Describe the image..."
          />
        </div>

        {Object.keys(mergedImgClasses).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(mergedImgClasses).map(([className, values]) => (
              <SelectedTailwindClass
                key={className}
                name={className}
                values={values}
                onRemove={handleImgRemove}
                onUpdate={handleImgUpdate}
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
                onClick={handleImgAdd}
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

      <div className="space-y-4">
        <h3 className="text-sm font-bold">Outer Container Styles</h3>

        {Object.keys(mergedOuterClasses).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(mergedOuterClasses).map(([className, values]) => (
              <SelectedTailwindClass
                key={className}
                name={className}
                values={values}
                onRemove={handleOuterRemove}
                onUpdate={handleOuterUpdate}
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
                onClick={handleOuterAdd}
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

export default StyleImagePanel;
