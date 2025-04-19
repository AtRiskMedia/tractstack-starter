// File: ./utils/storykeep/layout.ts
import { debounce } from "@/utils/common/helpers";

export const HEADER_HEIGHT_CSS_VAR = "--header-height";
// New CSS variable for the bottom offset of the controls wrapper
export const BOTTOM_CONTROLS_OFFSET_VAR = "--bottom-right-controls-bottom-offset";

export function setupLayoutStyles() {
  const style = document.createElement("style");
  style.innerHTML = `
    :root {
      ${HEADER_HEIGHT_CSS_VAR}: 0px;
      ${BOTTOM_CONTROLS_OFFSET_VAR}: 0.25rem; /* Default for md+ screens (Tailwind right-1) */
    }
  `;
  document.head.appendChild(style);
  return () => {
    document.head.removeChild(style);
  };
}

export function setupLayoutObservers() {
  let rafId: number | undefined;

  function updateLayout() {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      const header = document.getElementById("mainHeader");
      const headerSpacer = document.getElementById("headerSpacer");
      const nav = document.getElementById("mainNav");
      const navSpacer = document.getElementById("navSpacer");
      const toolbarNav = document.getElementById("toolbarNav");
      const isMobile = window.innerWidth < 801; // md breakpoint

      // --- Header Height ---
      if (header) {
        const headerHeight = header.offsetHeight;
        document.documentElement.style.setProperty(HEADER_HEIGHT_CSS_VAR, `${headerHeight}px`);
        if (headerSpacer) {
          headerSpacer.style.height = `${headerHeight}px`;
        }
      }

      // --- Main Nav Positioning & Spacers ---
      if (nav) {
        const navHeight = nav.offsetHeight;
        if (navSpacer && isMobile) {
          navSpacer.style.height = `${navHeight}px`;
        } else if (navSpacer) {
          navSpacer.style.height = "0px"; // Reset spacer on larger screens
        }

        if (!isMobile && header) {
          nav.style.top = `${header.offsetHeight}px`; // Position below header on md+
        } else {
          nav.style.top = "auto"; // Reset top position on mobile
        }

        if (isMobile) {
          // On mobile, offset by nav height
          const bottomOffset = navHeight;
          document.documentElement.style.setProperty(
            BOTTOM_CONTROLS_OFFSET_VAR,
            `${bottomOffset}px`
          );
        } else {
          // On md+, use default small offset from bottom
          document.documentElement.style.setProperty(BOTTOM_CONTROLS_OFFSET_VAR, "0.25rem");
        }
      } else {
        // Fallback if nav doesn't exist
        document.documentElement.style.setProperty(BOTTOM_CONTROLS_OFFSET_VAR, "0.25rem");
      }

      // --- Toolbar Positioning ---
      if (toolbarNav) {
        toolbarNav.style.bottom = isMobile && nav ? `${nav.offsetHeight}px` : "0";
        toolbarNav.style.left = isMobile ? "0" : "4rem"; // Tailwind md:w-16 = 4rem
      }
    });
  }

  // Create debounced version for resize events
  const debouncedUpdateLayout = debounce(updateLayout, 100);

  // Initial updates & listeners
  updateLayout();
  window.addEventListener("DOMContentLoaded", updateLayout);
  window.addEventListener("load", updateLayout);
  window.addEventListener("resize", debouncedUpdateLayout);

  // Setup ResizeObserver with a more selective approach (remains the same)
  const observer = new ResizeObserver((entries) => {
    const hasSignificantChange = entries.some((entry) => {
      const { width, height } = entry.contentRect;
      const element = entry.target as HTMLElement;
      const prevWidth = parseFloat(element.dataset.prevWidth || "0");
      const prevHeight = parseFloat(element.dataset.prevHeight || "0");
      const hasChanged = Math.abs(width - prevWidth) > 1 || Math.abs(height - prevHeight) > 1;
      if (hasChanged) {
        element.dataset.prevWidth = width.toString();
        element.dataset.prevHeight = height.toString();
      }
      return hasChanged;
    });
    if (hasSignificantChange) {
      updateLayout();
    }
  });

  ["mainHeader", "mainNav", "toolbarNav"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      observer.observe(element);
    }
  });

  // Return cleanup function
  return () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    window.removeEventListener("DOMContentLoaded", updateLayout);
    window.removeEventListener("load", updateLayout);
    window.removeEventListener("resize", debouncedUpdateLayout);
    observer.disconnect();
  };
}
