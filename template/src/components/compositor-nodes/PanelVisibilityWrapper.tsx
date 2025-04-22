import { useEffect, useRef, useState } from "react";
import { getCtx } from "@/store/nodes";
import type { NodesContext } from "@/store/nodes";
import type { ReactNode } from "react";

interface PanelVisibilityWrapperProps {
  nodeId: string;
  panelType: string;
  children: ReactNode;
  ctx?: NodesContext;
}

/**
 * Wrapper component that handles automatically closing panels when they scroll out of view
 */
const PanelVisibilityWrapper = ({
  nodeId,
  panelType,
  children,
  ctx,
}: PanelVisibilityWrapperProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const nodesCtx = ctx || getCtx();

  // Track active panel state for this specific component
  const [isActive, setIsActive] = useState(false);

  // Setup effect to track active panel state
  useEffect(() => {
    // Create a function to check if this panel is active
    const checkIfActive = () => {
      const activePaneMode = nodesCtx.activePaneMode.get();
      return activePaneMode.panel === panelType && activePaneMode.paneId === nodeId;
    };

    // Set initial state
    setIsActive(checkIfActive());

    // Subscribe to changes in the active panel mode
    const unsubscribe = nodesCtx.activePaneMode.subscribe(() => {
      setIsActive(checkIfActive());
    });

    return () => {
      unsubscribe();
    };
  }, [nodeId, panelType, nodesCtx]);

  // Setup intersection observer
  useEffect(() => {
    const currentWrapper = wrapperRef.current;
    if (!currentWrapper) return;

    // Always observe the panel, regardless of active state
    const observer = new IntersectionObserver(
      (entries) => {
        // Only take action if this panel is currently active and not intersecting
        if (!entries[0].isIntersecting && isActive) {
          nodesCtx.closeAllPanels();
        }
      },
      {
        threshold: 0.1, // Close when 90% of the panel is out of view
        rootMargin: "-10px", // Small margin to make detection a bit more forgiving
      }
    );

    observer.observe(currentWrapper);

    return () => {
      observer.disconnect();
    };
  }, [nodeId, panelType, nodesCtx, isActive]); // Include isActive in dependencies

  return (
    <div ref={wrapperRef} data-panel-type={panelType} data-node-id={nodeId} data-active={isActive}>
      {children}
    </div>
  );
};

export default PanelVisibilityWrapper;
