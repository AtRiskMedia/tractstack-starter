import { useState, useEffect, useRef, type RefObject } from "react";

/**
 * Hook that detects when an element is scrolled out of view and returns floating state information
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
  const scrollThrottleRef = useRef<number | null>(null);

  useEffect(() => {
    if (disabled) {
      setIsFloating(false);
      setOpacity(normalOpacity);
      return;
    }

    const handleScroll = () => {
      if (scrollThrottleRef.current !== null) {
        return;
      }

      scrollThrottleRef.current = window.setTimeout(() => {
        scrollThrottleRef.current = null;

        if (!elementRef.current) return;

        const rect = elementRef.current.getBoundingClientRect();
        const isElementOut = rect.bottom + offset <= 0;

        setIsFloating(isElementOut);
        setOpacity(isElementOut ? floatingOpacity : normalOpacity);
      }, 100); // Throttle to 100ms
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Run once on mount to set initial state
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (scrollThrottleRef.current !== null) {
        clearTimeout(scrollThrottleRef.current);
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
