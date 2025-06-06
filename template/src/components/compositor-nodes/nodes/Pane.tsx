import { useEffect, useState, useCallback, memo, type CSSProperties } from "react";
import { getCtx } from "@/store/nodes.ts";
import { viewportKeyStore, showAnalytics } from "@/store/storykeep.ts";
import { RenderChildren } from "@/components/compositor-nodes/nodes/RenderChildren.tsx";
import PaneAnalyticsPanel from "@/components/storykeep/controls/pane/PaneAnalyticsPanel.tsx";
import FeaturedContentSetup from "@/components/codehooks/FeaturedContentSetup";
import ListContentSetup from "@/components/codehooks/ListContentSetup";
import BunnyVideoSetup from "@/components/codehooks/BunnyVideoSetup";
import { type NodeProps } from "@/types";

const CodeHookContainer = ({
  payload,
}: {
  payload: { target: string; params?: Record<string, string> };
}) => (
  <div className="w-full p-6 my-4 bg-gray-50">
    <div className="mb-4 border-2 border-dashed border-gray-300 rounded-lg p-6 bg-slate-50">
      <h3 className="text-lg text-gray-700">
        Code Hook:{" "}
        <span className="font-action font-bold">{payload.target || `CodeHook not found!`}</span>
      </h3>
    </div>
    {payload.params && (
      <div className="space-y-2">
        {Object.entries(payload.params).map(
          ([key, value]) =>
            value && (
              <div key={key} className="flex items-start">
                <span className="font-bold text-gray-600 min-w-24">{key}:</span>
                <span className="text-gray-800 ml-2">{JSON.stringify(value)}</span>
              </div>
            )
        )}
      </div>
    )}
  </div>
);

const Pane = memo(
  (props: NodeProps) => {
    const $showAnalytics = showAnalytics.get();

    // Track the viewport value in state so we can react to changes
    const [currentViewport, setCurrentViewport] = useState(viewportKeyStore.get().value);

    // Update component state when viewport changes
    useEffect(() => {
      const unsubscribeViewport = viewportKeyStore.subscribe((newViewport) => {
        setCurrentViewport(newViewport.value);
      });

      return () => {
        unsubscribeViewport();
      };
    }, []);

    const wrapperClasses = `grid ${getCtx(props).getNodeClasses(props.nodeId, currentViewport)}`;

    const contentClasses = "relative w-full h-auto justify-self-start";
    const contentStyles: CSSProperties = {
      ...getCtx(props).getNodeCSSPropertiesStyles(props.nodeId),
      gridArea: "1/1/1/1",
      position: "relative",
      zIndex: 1,
    };
    const codeHookPayload = getCtx(props).getNodeCodeHookPayload(props.nodeId);
    const codeHookTarget = codeHookPayload?.target;
    const codeHookParams =
      codeHookPayload?.params?.options && typeof codeHookPayload.params.options === `string`
        ? JSON.parse(codeHookPayload.params.options)
        : null;

    const [children, setChildren] = useState<string[]>([
      ...getCtx(props).getChildNodeIDs(props.nodeId),
    ]);
    const [renderCount, setRenderCount] = useState(0); // Force rerender with counter

    const getPaneId = () => `pane-${props.nodeId}`;

    const handleNotification = useCallback(() => {
      //console.log(" !! Pane received notification, updating:", props.nodeId);
      const newChildren = [...getCtx(props).getChildNodeIDs(props.nodeId)];
      setChildren(newChildren); // Fresh copy
      setRenderCount((prev) => prev + 1); // Increment to force rerender
    }, [props.nodeId, props.ctx]);

    useEffect(() => {
      const unsubscribe = getCtx(props).notifications.subscribe(props.nodeId, handleNotification);
      return unsubscribe;
    }, [props.nodeId, handleNotification]);

    return (
      <div id={getPaneId()} className="pane">
        <div id={getCtx(props).getNodeSlug(props.nodeId)} className={wrapperClasses}>
          <div
            className={contentClasses}
            style={contentStyles}
            onClick={(e) => {
              if (
                !(
                  codeHookPayload &&
                  typeof codeHookTarget === `string` &&
                  [`list-content`, `featured-content`, `bunny-video`].includes(codeHookTarget)
                )
              )
                getCtx(props).setClickedNodeId(props.nodeId, true);
              e.stopPropagation();
            }}
          >
            {codeHookPayload && codeHookTarget === `featured-content` ? (
              <FeaturedContentSetup nodeId={props.nodeId} params={codeHookParams} />
            ) : codeHookPayload && codeHookTarget === `list-content` ? (
              <ListContentSetup nodeId={props.nodeId} params={codeHookParams} />
            ) : codeHookPayload && codeHookTarget === `bunny-video` ? (
              <BunnyVideoSetup nodeId={props.nodeId} params={codeHookParams} />
            ) : codeHookPayload && codeHookTarget ? (
              <CodeHookContainer payload={{ target: codeHookTarget, params: codeHookParams }} />
            ) : (
              <RenderChildren
                children={children}
                nodeProps={props}
                key={`render-children-${props.nodeId}-${renderCount}`}
              />
            )}
            {$showAnalytics ? <PaneAnalyticsPanel nodeId={props.nodeId} /> : null}
          </div>
        </div>
      </div>
    );
  },
  (prevProps: NodeProps, nextProps: NodeProps) => {
    const isEqual = prevProps.nodeId === nextProps.nodeId && prevProps.ctx === nextProps.ctx;
    if (!isEqual) {
      console.log(
        ` !! Pane rerender triggered by props change: ${prevProps.nodeId} -> ${nextProps.nodeId}`
      );
    }
    return isEqual;
  }
);

Pane.displayName = "Pane";
export { Pane, CodeHookContainer };
