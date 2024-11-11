import { useEffect, useRef } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useInterval(callback: any, delay: number | null) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const savedCallback: any = useRef();
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
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
