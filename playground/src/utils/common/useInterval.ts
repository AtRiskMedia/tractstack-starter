import { useEffect, useRef } from "react";

/**
 * Custom hook for setting up an interval that can be safely used with React's lifecycle
 * @param callback Function to be called on each interval
 * @param delay Delay in milliseconds between each interval, or null to stop the interval
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    function tick() {
      savedCallback.current();
    }

    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
