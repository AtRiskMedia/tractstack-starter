import { Svg } from "@/components/common/panes/Svg.tsx";
import type { VisualBreakNode, ViewportKey } from "@/types.ts";

interface BgPaneProps {
  payload: VisualBreakNode;
  viewportKey: ViewportKey;
}

const BgPane = ({ payload, viewportKey }: BgPaneProps) => {
  // For specific viewport rendering
  if (viewportKey === "mobile" || viewportKey === "tablet" || viewportKey === "desktop") {
    const capitalizedViewport = viewportKey.charAt(0).toUpperCase() + viewportKey.slice(1);
    const hiddenViewportKey = `hiddenViewport${capitalizedViewport}` as keyof VisualBreakNode;
    const breakKey = `break${capitalizedViewport}` as keyof VisualBreakNode;

    // Check if this viewport should be hidden
    if (payload[hiddenViewportKey]) {
      return null;
    }

    const breakData = payload[breakKey] as
      | {
          collection: string;
          image: string;
          svgFill: string;
        }
      | undefined;

    if (!breakData) {
      return null;
    }

    return (
      <div className="grid" style={{ fill: breakData.svgFill || "none" }}>
        <Svg
          shapeName={`${breakData.collection}${breakData.image}`}
          viewportKey={viewportKey}
          id={`${viewportKey}-${breakData.collection}${breakData.image}`}
        />
      </div>
    );
  }

  // For responsive rendering
  const baseClasses = {
    mobile: "md:hidden",
    tablet: "hidden md:block xl:hidden",
    desktop: "hidden xl:block",
  };

  const breakpoints = ["mobile", "tablet", "desktop"] as const;

  return (
    <>
      {breakpoints.map((breakpoint) => {
        const capitalizedBreakpoint = breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1);
        const hiddenViewportKey = `hiddenViewport${capitalizedBreakpoint}` as keyof VisualBreakNode;

        if (payload[hiddenViewportKey]) {
          return null;
        }

        const breakData = payload[`break${capitalizedBreakpoint}` as keyof VisualBreakNode] as
          | {
              collection: string;
              image: string;
              svgFill: string;
            }
          | undefined;

        if (!breakData) {
          return null;
        }

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
