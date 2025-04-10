import type { BgImageNode, ViewportKey } from "@/types.ts";

interface BgImageProps {
  payload: BgImageNode;
  viewportKey?: ViewportKey;
}

export const BgImage = ({ payload, viewportKey }: BgImageProps) => {
  // Helper to check if the image should be hidden on a specific viewport
  const isHiddenOnViewport = (viewport: "Mobile" | "Tablet" | "Desktop"): boolean => {
    const key = `hiddenViewport${viewport}` as keyof BgImageNode;
    return !!payload[key];
  };

  // For viewport-specific rendering
  if (viewportKey === "mobile" || viewportKey === "tablet" || viewportKey === "desktop") {
    const viewportCapitalized = viewportKey.charAt(0).toUpperCase() + viewportKey.slice(1);
    const hiddenViewportKey = `hiddenViewport${viewportCapitalized}` as keyof BgImageNode;

    // Skip rendering if this viewport should be hidden
    if (payload[hiddenViewportKey]) {
      return null;
    }

    return (
      <div
        className="w-full h-full absolute top-0 left-0"
        style={{
          backgroundImage: `url(${payload.src})`,
          backgroundSize: payload.objectFit || "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          zIndex: 0,
        }}
        role="img"
        aria-label={payload.alt || "Background image"}
      />
    );
  }

  // Build responsive class based on visibility settings
  const buildResponsiveClass = (): string => {
    const hiddenMobile = isHiddenOnViewport("Mobile");
    const hiddenTablet = isHiddenOnViewport("Tablet");
    const hiddenDesktop = isHiddenOnViewport("Desktop");

    const classes = [];

    if (hiddenMobile) classes.push("hidden xs:hidden");
    else classes.push("block");

    if (hiddenTablet) classes.push("md:hidden");
    else if (hiddenMobile) classes.push("md:block");

    if (hiddenDesktop) classes.push("xl:hidden");
    else if (hiddenTablet) classes.push("xl:block");

    return classes.join(" ");
  };

  // Render a single responsive element
  return (
    <div
      className={`w-full h-full absolute top-0 left-0 ${buildResponsiveClass()}`}
      style={{
        backgroundImage: `url(${payload.src})`,
        backgroundSize: payload.objectFit || "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        zIndex: 0,
      }}
      role="img"
      aria-label={payload.alt || "Background image"}
    />
  );
};

export default BgImage;
