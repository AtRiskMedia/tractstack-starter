import { useState, useEffect, useCallback } from "react";
import type { RefObject } from "react";

interface DropdownDirection {
  openAbove: boolean;
  maxHeight: number;
}

export function useDropdownDirection(triggerRef: RefObject<HTMLElement | null>): DropdownDirection {
  const [state, setState] = useState<DropdownDirection>({
    openAbove: false,
    maxHeight: 300,
  });

  const updateDirection = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const newOpenAbove = spaceBelow < 300 && spaceAbove > spaceBelow;
      const newMaxHeight = newOpenAbove
        ? Math.min(spaceAbove - 10, 300)
        : Math.min(spaceBelow - 10, 300);
      setState({ openAbove: newOpenAbove, maxHeight: newMaxHeight });
    }
  }, [triggerRef]);

  useEffect(() => {
    updateDirection();

    const handleResize = () => {
      // Only update if the width changes, to avoid keyboard triggers
      if (window.innerWidth !== window.visualViewport?.width) {
        updateDirection();
      }
    };

    window.addEventListener("resize", handleResize);

    // Use ResizeObserver to watch for changes in the trigger element's size or position
    const resizeObserver = new ResizeObserver(updateDirection);
    if (triggerRef.current) {
      resizeObserver.observe(triggerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, [updateDirection, triggerRef]);

  return state;
}
