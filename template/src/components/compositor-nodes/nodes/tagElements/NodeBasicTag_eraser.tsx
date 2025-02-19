import { getCtx } from "@/store/nodes.ts";
import TrashIcon from "@heroicons/react/24/outline/TrashIcon";
import { viewportKeyStore, keyboardAccessible } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import { showGuids } from "@/store/development.ts";
import type { NodeProps } from "@/types"
import { type JSX, type MouseEvent, type KeyboardEvent, useEffect, useState } from "react";
import { tagTitles } from "@/constants";

type NodeTagProps = NodeProps & { tagName: keyof JSX.IntrinsicElements };

export const NodeBasicTagEraser = (props: NodeTagProps) => {
  const nodeId = props.nodeId;
  const [children, setChildren] = useState<string[]>(getCtx(props).getChildNodeIDs(nodeId));

  const Tag = props.tagName;
  const tagTitle = tagTitles[props.tagName as keyof typeof tagTitles] || props.tagName;

  useEffect(() => {
    const unsubscribe = getCtx(props).notifications.subscribe(nodeId, () => {
      setChildren(getCtx(props).getChildNodeIDs(nodeId));
    });
    return unsubscribe;
  }, []);

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    getCtx(props).setClickedNodeId(nodeId);
  };

  const EraserUI = () => (
    <div
      className={`absolute top-2 left-2 flex items-center gap-2 ${!keyboardAccessible.get() ? "opacity-20 group-hover:opacity-100 group-focus-within:opacity-100" : ""} transition-opacity z-50 pointer-events-none`}
    >
      <div className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded-full">{tagTitle}</div>
      <div className="px-2 py-1 bg-white group-hover:bg-red-700 group-hover:text-white group-focus-within:bg-red-700 group-focus-within:text-white text-red-700 text-sm rounded shadow-sm transition-colors flex items-center gap-1">
        <TrashIcon className="h-4 w-4" />
        Click anywhere to delete
      </div>
    </div>
  );

  const baseComponent = (
    <div
      className="relative group cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as unknown as MouseEvent);
        }
      }}
    >
      <div className="absolute inset-0">
        <div className="h-full w-full outline outline-4 outline-dashed mix-blend-difference outline-red-700 opacity-50 group-hover:opacity-100 group-focus-within:opacity-100" />
      </div>
      <EraserUI />
      <div
        className={`${getCtx(props).getNodeClasses(nodeId, viewportKeyStore.get().value)} pt-12`}
      >
        <RenderChildren children={children} nodeProps={props} />
      </div>
    </div>
  );

  if (showGuids.get()) return baseComponent;

  return (
    <div
      className="relative group cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as unknown as MouseEvent);
        }
      }}
    >
      <div className="absolute inset-0">
        <div className="h-full w-full outline outline-4 outline-dashed mix-blend-difference outline-red-700 opacity-50 group-hover:opacity-100 group-focus-within:opacity-100" />
      </div>
      <EraserUI />
      <Tag
        className={`${getCtx(props).getNodeClasses(nodeId, viewportKeyStore.get().value)} pt-12`}
      >
        <RenderChildren children={children} nodeProps={props} />
      </Tag>
    </div>
  );
};
