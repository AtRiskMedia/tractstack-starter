import { useState, useEffect, useRef, type RefObject } from "react";

/**
 * Hook that detects when an element is scrolled out of view and returns floating state information
 * Using IntersectionObserver for better performance than scroll events
 *
 * @param elementRef - Reference to the element we want to monitor (generally the header)
 * @param options - Configuration options
 * @returns Object with floating state and calculated opacity
 */
export function useFloatingOnScroll<T extends HTMLElement>(
  elementRef: RefObject<T>,
  options: {
    offset?: number; // Additional offset threshold for activation
    floatingOpacity?: number; // Opacity when floating (0-1)
    normalOpacity?: number; // Opacity when not floating (0-1)
    disabled?: boolean; // Whether to disable the floating behavior
  } = {}
) {
  const { offset = 0, floatingOpacity = 0.5, normalOpacity = 1, disabled = false } = options;

  const [isFloating, setIsFloating] = useState(false);
  const [opacity, setOpacity] = useState(normalOpacity);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (disabled || !elementRef.current) {
      setIsFloating(false);
      setOpacity(normalOpacity);
      return;
    }

    // Create the observer with options
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        // Element is out of view when not intersecting
        const isElementOut = !entry.isIntersecting;

        setIsFloating(isElementOut);

        // We can calculate a smoother opacity transition based on
        // intersection ratio if needed
        setOpacity(isElementOut ? floatingOpacity : normalOpacity);
      },
      {
        // Root is the viewport by default when null
        root: null,
        // Add the offset to the top margin
        // Negative values mean the element can be partially out of view
        // before being considered "not intersecting"
        rootMargin: `${-offset}px 0px 0px 0px`,
        // Default threshold is 0, which means detect as soon as one pixel crosses
        threshold: 0,
      }
    );

    // Start observing the element
    observerRef.current.observe(elementRef.current);

    return () => {
      // Clean up the observer on unmount
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [elementRef, offset, floatingOpacity, normalOpacity, disabled]);

  return {
    isFloating,
    opacity,
    resetFloating: () => {
      setIsFloating(false);
      setOpacity(normalOpacity);
    },
  };
}

export default useFloatingOnScroll;
