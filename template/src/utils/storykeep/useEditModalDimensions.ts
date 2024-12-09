import { useState, useEffect, useMemo, useLayoutEffect, useCallback } from "react";
import { SMALL_SCREEN_WIDTH } from "../../constants";

interface Dimensions {
  height: string;
  width: string;
  position: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  isFullWidthMobileShort: boolean;
  transitionClass: string;
}

const TRANSITION_CLASS = "modal-transition";

export const useEditModalDimensions = (): Dimensions => {
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  const [headerBottom, setHeaderBottom] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const updateHeaderBottom = useCallback(() => {
    const header = document.getElementById("main-header");
    setHeaderBottom(header?.getBoundingClientRect().bottom || 0);
  }, []);

  useLayoutEffect(() => {
    updateHeaderBottom();
    setIsInitialized(true);
  }, [updateHeaderBottom]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      updateHeaderBottom();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updateHeaderBottom]);

  const dimensions = useMemo<Dimensions>(() => {
    const smallScreenDimensions = {
      height: "auto",
      width: "100%",
      position: { bottom: "0", left: "0", right: "0" },
      isFullWidthMobileShort: true,
    };

    const mediumScreenDimensions = {
      height: "auto",
      width: `${Math.min(windowWidth * 0.8, 500)}px`,
      position: { bottom: "0px", right: "8px" },
      isFullWidthMobileShort: false,
    };

    //const largeScreenDimensions = {
    //  height: "auto",
    //  width: "33%",
    //  position: { top: `${headerBottom}px`, right: "0" },
    //  isFullWidthMobileShort: false,
    //};

    let currentDimensions;
    if (windowWidth < SMALL_SCREEN_WIDTH) {
      currentDimensions = smallScreenDimensions;
      //} else if (windowWidth < 1368) {
    } else {
      currentDimensions = mediumScreenDimensions;
      //  currentDimensions = largeScreenDimensions;
    }

    return {
      ...currentDimensions,
      transitionClass: isInitialized ? TRANSITION_CLASS : "",
    };
  }, [windowWidth, headerBottom, isInitialized]);

  return dimensions;
};
