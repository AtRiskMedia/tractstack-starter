import { Svg } from "../../common/panes/Svg";
import type { VisualBreakNode, VisualBreakData, ViewportKey } from "../../../types";

interface BgPaneProps {
  payload: VisualBreakNode;
  viewportKey: ViewportKey;
}

const BgPane = ({ payload, viewportKey }: BgPaneProps) => {
  const baseClasses = {
    mobile: viewportKey === "mobile" ? "grid" : viewportKey ? "hidden" : "md:hidden",
    tablet: viewportKey === "tablet" ? "grid" : viewportKey ? "hidden" : "hidden md:grid xl:hidden",
    desktop: viewportKey === "desktop" ? "grid" : viewportKey ? "hidden" : "hidden xl:grid",
  };

  // Only render the current viewport's break if viewportKey is specified
  const breakpoints = viewportKey ? [viewportKey] : ["mobile", "tablet", "desktop"];

  return (
    <>
      {breakpoints.map((breakpoint) => {
        const capitalizedBreakpoint = breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1);

        if (payload[`hiddenViewport${capitalizedBreakpoint}` as keyof VisualBreakNode]) {
          return null;
        }

        const breakData = payload[`break${capitalizedBreakpoint}` as keyof VisualBreakNode];
        if (!breakData || typeof breakData !== "object") return null;

        return (
          <div
            key={breakpoint}
            className={baseClasses[breakpoint as keyof typeof baseClasses] || ``}
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
