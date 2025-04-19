import { debounce } from "@/utils/common/helpers";

export const HEADER_HEIGHT_CSS_VAR = "--header-height";
export const BOTTOM_CONTROLS_OFFSET_VAR = "--bottom-right-controls-bottom-offset";

export function setupLayoutStyles() {
  const style = document.createElement("style");
  style.innerHTML = `
    :root {
      ${HEADER_HEIGHT_CSS_VAR}: 0px;
      ${BOTTOM_CONTROLS_OFFSET_VAR}: 0.25rem; /* Default for md+ screens */
    }
  `;
  document.head.appendChild(style);
  return () => {
    // Check if the style element is still a child of head before removing
    if (style.parentNode === document.head) {
      document.head.removeChild(style);
    }
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
      const mainNav = document.getElementById("mainNav");
      const navSpacer = document.getElementById("navSpacer");
      const toolbarNav = document.getElementById("toolbarNav"); // Container for AddElementsPanel
      const isMobile = window.innerWidth < 768; // Tailwind 'md' breakpoint is 768px

      // --- Header Height ---
      let headerHeight = 0;
      if (header) {
        headerHeight = header.offsetHeight;
        document.documentElement.style.setProperty(HEADER_HEIGHT_CSS_VAR, `${headerHeight}px`);
        if (headerSpacer) {
          headerSpacer.style.height = `${headerHeight}px`;
        }
      }

      // --- Main Nav Positioning & Spacers (Mobile vs Desktop) ---
      let mainNavHeight = 0;
      if (mainNav) {
        mainNavHeight = mainNav.offsetHeight;
        if (navSpacer && isMobile) {
          navSpacer.style.height = `${mainNavHeight}px`; // Spacer for bottom nav on mobile
        } else if (navSpacer) {
          navSpacer.style.height = "0px"; // No spacer needed on desktop
        }

        // Position side nav below header on desktop
        if (!isMobile && headerHeight > 0) {
          mainNav.style.top = `${headerHeight}px`;
        } else {
          mainNav.style.top = "auto"; // Reset top for mobile fixed bottom nav
        }
      }

      // --- Toolbar Positioning & Height ---
      let toolbarNavHeight = 0;
      if (toolbarNav) {
        toolbarNavHeight = toolbarNav.offsetHeight; // Get height even if visually hidden but rendered

        if (isMobile && mainNavHeight > 0) {
          // Position toolbar *above* the main bottom nav on mobile
          toolbarNav.style.bottom = `${mainNavHeight}px`;
          toolbarNav.style.left = "0";
          toolbarNav.style.width = "100%"; // Ensure it spans width on mobile
        } else {
          // Position toolbar next to side nav on desktop
          toolbarNav.style.bottom = "0";
          toolbarNav.style.left = "4rem"; // Tailwind md:w-16 = 4rem
          toolbarNav.style.width = "auto"; // Let content determine width
        }
      }

      // --- Bottom Right Controls Offset Calculation ---
      let bottomOffsetValue = 0.25; // Default offset in rem for desktop
      if (isMobile) {
        // Calculate total bottom height on mobile
        const totalBottomHeight = mainNavHeight + (toolbarNavHeight > 0 ? toolbarNavHeight : 0);
        bottomOffsetValue = totalBottomHeight; // Use pixel value for mobile offset
        document.documentElement.style.setProperty(
          BOTTOM_CONTROLS_OFFSET_VAR,
          `${bottomOffsetValue}px` // Use px for mobile
        );
      } else {
        // Use default rem value for desktop
        document.documentElement.style.setProperty(
          BOTTOM_CONTROLS_OFFSET_VAR,
          `${bottomOffsetValue}rem` // Use rem for desktop
        );
      }

      // --- Reset RafId ---
      rafId = undefined;
    });
  }

  // Create debounced version for resize events
  const debouncedUpdateLayout = debounce(updateLayout, 150); // Increased debounce slightly

  // Initial updates & listeners
  // Use requestAnimationFrame for initial calls to ensure DOM is ready
  requestAnimationFrame(updateLayout);
  window.addEventListener("DOMContentLoaded", () => requestAnimationFrame(updateLayout));
  window.addEventListener("load", () => requestAnimationFrame(updateLayout));
  window.addEventListener("resize", debouncedUpdateLayout);

  // Setup ResizeObserver (remains the same)
  const observer = new ResizeObserver((entries) => {
    // More robust check for significant changes
    let changed = false;
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      const element = entry.target as HTMLElement;
      // Check if dimensions have changed significantly (more than 1px)
      if (
        Math.abs(width - parseFloat(element.dataset.prevWidth || "0")) > 1 ||
        Math.abs(height - parseFloat(element.dataset.prevHeight || "0")) > 1
      ) {
        element.dataset.prevWidth = width.toString();
        element.dataset.prevHeight = height.toString();
        changed = true;
        break; // No need to check others if one changed
      }
    }
    if (changed) {
      updateLayout(); // Use non-debounced for ResizeObserver
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
