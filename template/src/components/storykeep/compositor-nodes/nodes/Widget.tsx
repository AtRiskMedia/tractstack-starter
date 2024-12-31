import { YouTubeWrapper } from "../../../frontend/widgets/YouTubeWrapper";
import { Belief } from "../../../frontend/widgets/Belief";
import { IdentifyAs } from "../../../frontend/widgets/IdentifyAs";
import { ToggleBelief } from "../../../frontend/widgets/ToggleBelief";
import { SignUp } from "../../../frontend/widgets/SignUp";
import { memo } from "react";
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

export const Widget = memo((props: WidgetProps) => {
  const { nodeId, hook, value1, value2, value3 } = props;
  if (!hook || !value1) return null;

  const classNames = getCtx(props).getNodeClasses(nodeId, viewportStore.get().value);
  switch (hook) {
    case "youtube":
      if (!value2) return null;
      return (
        <div className={classNames}>
          <YouTubeWrapper embedCode={value1} title={value2} />
        </div>
      );

    case "signup":
      return (
        <div className={classNames}>
          <SignUp
            persona={value1 ?? "Major Updates Only"}
            prompt={value2 ?? "Keep in touch!"}
            clarifyConsent={value3 === "true"}
          />
        </div>
      );

    case "belief":
      if (!value2) return null;
      return (
        <div className={classNames}>
          <Belief value={{ slug: value1, scale: value2, extra: value3 }} readonly={true} />
        </div>
      );

    case "identifyAs":
      if (!value2) return null;
      return (
        <IdentifyAs
          classNames={classNames}
          value={{ slug: value1, target: value2, extra: value3 || `` }}
          readonly={true}
        />
      );

    case "toggle":
      if (!value2) return null;
      return (
        <div className={classNames}>
          <ToggleBelief belief={value1} prompt={value2} readonly={true} />
        </div>
      );

    case "resource":
      return (
        <div className={classNames}>
          <div>
            <strong>Resource Template (not yet implemented):</strong> {value1}, {value2}
          </div>
        </div>
      );

    case "bunny":
      return <div className={classNames}>Bunny Video</div>;

    // Note: Bunny components are not included in React version since they're Astro-only
    default:
      return null;
  }
});
