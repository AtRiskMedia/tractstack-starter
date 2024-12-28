import { Svg } from "../../common/panes/Svg";
import type { VisualBreakNode, ViewportKey } from "../../../types";

interface BgPaneProps {
  payload: VisualBreakNode;
  viewportKey: ViewportKey;
}

const BgPane = ({ payload, viewportKey }: BgPaneProps) => {
  const baseClasses = {
    mobile: "md:hidden",
    tablet: "hidden md:block xl:hidden",
    desktop: "hidden xl:block"
  };

  const breakpoints = ["mobile", "tablet", "desktop"] as const;

  return (
    <>
      {breakpoints.map((breakpoint) => {
        const capitalizedBreakpoint = breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1);

        if (payload[`hiddenViewport${capitalizedBreakpoint}` as keyof VisualBreakNode]) {
          return null;
        }

        const breakData = payload[`break${capitalizedBreakpoint}` as keyof VisualBreakNode] as {
          collection: string;
          image: string;
          svgFill: string;
        } | undefined;

        if (!breakData) return null;

        return (
          <div 
            key={breakpoint}
            className={baseClasses[breakpoint]}
            style={{ fill: breakData.svgFill || "none" }}
          >
            <Svg
              shapeName={`${breakData.collection}${breakData.image}`}
              viewportKey={breakpoint}
              id={`${breakpoint}-${breakData.collection}${breakData.image}`}
            />
          </div>
        );
      })}
    </>
  );
};

export default BgPane;
