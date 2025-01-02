import { YouTubeWrapper } from "../../../frontend/widgets/YouTubeWrapper";
import { Belief } from "../../../frontend/widgets/Belief";
import { IdentifyAs } from "../../../frontend/widgets/IdentifyAs";
import { ToggleBelief } from "../../../frontend/widgets/ToggleBelief";
import { SignUp } from "../../../frontend/widgets/SignUp";
import { memo, type ReactElement } from "react";
import { getCtx, NodesContext } from "@/store/nodes.ts";
import { viewportStore } from "@/store/storykeep.ts";

export interface WidgetProps {
  nodeId: string;
  ctx?: NodesContext;
  hook: string | null;
  value1: string | null;
  value2: string | null;
  value3: string;
}

const getWidgetElement = (props: WidgetProps, classNames: string): ReactElement | null => {
  const { hook, value1, value2, value3 } = props;
  if (!hook || !value1) return null;

  switch (hook) {
    case "youtube":
      return value2 ? (
        <div className={`${classNames} pointer-events-none`}>
          <YouTubeWrapper embedCode={value1} title={value2} />
        </div>
      ) : null;

    case "signup":
      return (
        <div className={`${classNames} pointer-events-none`}>
          <SignUp
            persona={value1 ?? "Major Updates Only"}
            prompt={value2 ?? "Keep in touch!"}
            clarifyConsent={value3 === "true"}
          />
        </div>
      );

    case "belief":
      return value2 ? (
        <div className={`${classNames} pointer-events-none`}>
          <Belief value={{ slug: value1, scale: value2, extra: value3 }} readonly={true} />
        </div>
      ) : null;

    case "identifyAs":
      return value2 ? (
        <IdentifyAs
          classNames={`${classNames} pointer-events-none`}
          value={{ slug: value1, target: value2, extra: value3 || `` }}
          readonly={true}
        />
      ) : null;

    case "toggle":
      return value2 ? (
        <div className={`${classNames} pointer-events-none`}>
          <ToggleBelief belief={value1} prompt={value2} readonly={true} />
        </div>
      ) : null;

    case "resource":
      return (
        <div className={`${classNames} pointer-events-none`}>
          <div>
            <strong>Resource Template (not yet implemented):</strong> {value1}, {value2}
          </div>
        </div>
      );

    case "bunny":
      return <div className={`${classNames} pointer-events-none`}>Bunny Video</div>;

    default:
      return null;
  }
};

export const Widget = memo((props: WidgetProps) => {
  const classNames = getCtx(props).getNodeClasses(props.nodeId, viewportStore.get().value);
  const content = getWidgetElement(props, classNames);

  if (!content) return null;

  return (
    <div
      onClick={(e) => {
        getCtx(props).setClickedNodeId(props.nodeId);
        e.stopPropagation();
      }}
    >
      {content}
    </div>
  );
});
