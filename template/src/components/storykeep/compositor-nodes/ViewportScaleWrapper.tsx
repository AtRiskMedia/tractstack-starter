import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { scaleStore, viewportStore, viewportKeyStore } from "@/store/storykeep";

const VIEWPORT_BREAKPOINTS = {
  mobile: { min: 0, max: 800 },
  tablet: { min: 801, max: 1367 },
  desktop: { min: 1368, max: 1920 },
} as const;

const SCALE_OPTIONS = [100, 75, 50, 25] as const;

interface ViewportScaleWrapperProps {
  children: ReactNode;
  className?: string;
}

export const ViewportScaleWrapper = ({ children, className = "" }: ViewportScaleWrapperProps) => {
  const $viewport = useStore(viewportStore);
  const $viewportKey = useStore(viewportKeyStore);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate the appropriate scale based on viewport and available width
  const calculateScale = (availableWidth: number, targetViewport: string): number => {
    const minWidth = VIEWPORT_BREAKPOINTS[targetViewport as keyof typeof VIEWPORT_BREAKPOINTS]?.min;

    if (!minWidth) return 100;

    // If we have enough space for minimum width, use 100% scale
    if (availableWidth >= minWidth) {
      return 100;
    }

    // Find the largest scale that will fit
    return SCALE_OPTIONS.find((scale) => minWidth * (scale / 100) <= availableWidth) || 25; // Default to 25% if nothing else fits
  };

  useEffect(() => {
    const updateDimensions = () => {
      // Get the parent container width (excluding any padding/margins)
      const container = document.querySelector(".viewport-scale-container");
      if (container) {
        setContainerWidth(container.clientWidth);
      }
    };

    // Initial measurement
    updateDimensions();

    // Listen for window resize
    window.addEventListener("resize", updateDimensions);

    // Cleanup
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    // Calculate and update scale whenever container width or viewport changes
    const newScale = calculateScale(containerWidth, $viewportKey.value || $viewport.value);

    scaleStore.set({ value: newScale });
  }, [containerWidth, $viewport.value, $viewportKey.value]);

  return (
    <div
      className={`viewport-scale-container relative w-full overflow-x-auto min-h-screen ${className}`}
    >
      {children}
    </div>
  );
};
