import { useEffect, useRef, useState, useCallback } from "react";
import { getCtx } from "@/store/nodes";
import type { NodesContext } from "@/store/nodes";

/**
 * Hook to automatically close panel when it scrolls out of view
 * @param nodeId The ID of the node associated with the panel
 * @param panelType The type of panel ("settings", "add", "storyfragment", etc.)
 * @param ctx Optional NodesContext instance
 * @returns A ref to attach to the panel element
 */
export const usePanelVisibility = (nodeId: string, panelType: string, ctx?: NodesContext) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const nodesCtx = ctx || getCtx();

  // Track active panel state within the hook
  const [isActive, setIsActive] = useState(false);

  // Create a memoized function to check if this panel is active
  const checkIfActive = useCallback(() => {
    const activePaneMode = nodesCtx.activePaneMode.get();
    return activePaneMode.panel === panelType && activePaneMode.paneId === nodeId;
  }, [nodeId, panelType, nodesCtx]);

  // Setup effect to track active panel state
  useEffect(() => {
    // Set initial state
    setIsActive(checkIfActive());

    // Subscribe to changes in the active panel mode
    const unsubscribe = nodesCtx.activePaneMode.subscribe(() => {
      setIsActive(checkIfActive());
    });

    return () => {
      unsubscribe();
    };
  }, [checkIfActive, nodesCtx]);

  // Setup intersection observer
  useEffect(() => {
    const currentPanel = panelRef.current;
    if (!currentPanel) return;

    // Configure observer
    const observer = new IntersectionObserver(
      (entries) => {
        // Only take action if this panel is currently active and not intersecting
        if (!entries[0].isIntersecting && isActive) {
          // Double-check that this panel is still active before closing
          if (checkIfActive()) {
            nodesCtx.closeAllPanels();
          }
        }
      },
      {
        threshold: 0.1, // Close when 90% of the panel is out of view
        rootMargin: "-10px", // Small margin to make detection a bit more forgiving
      }
    );

    // Always observe the panel, regardless of active state
    observer.observe(currentPanel);

    return () => {
      observer.disconnect();
    };
  }, [nodeId, panelType, nodesCtx, isActive, checkIfActive]); // Include all dependencies

  return panelRef;
};
