import { debounce } from "@/utils/common/helpers";

export const HEADER_HEIGHT_CSS_VAR = "--header-height";

export function setupLayoutStyles() {
  const style = document.createElement("style");
  style.innerHTML = `
    :root {
      ${HEADER_HEIGHT_CSS_VAR}: 0px;
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

      if (header) {
        const headerHeight = header.offsetHeight;
        document.documentElement.style.setProperty(HEADER_HEIGHT_CSS_VAR, `${headerHeight}px`);
        if (headerSpacer) {
          headerSpacer.style.height = `${headerHeight}px`;
        }
      }

      if (nav) {
        const navHeight = nav.offsetHeight;
        if (navSpacer) {
          navSpacer.style.height = `${navHeight}px`;
        }

        if (window.innerWidth >= 801) {
          nav.style.top = header?.offsetHeight + "px";
        } else {
          nav.style.top = "auto";
        }
      }

      if (toolbarNav) {
        toolbarNav.style.bottom = window.innerWidth < 801 ? nav?.offsetHeight + "px" : "0";
        toolbarNav.style.left = window.innerWidth < 801 ? "0" : "4rem";
      }
    });
  }

  // Create debounced version for resize events
  const debouncedUpdateLayout = debounce(updateLayout, 100);

  // Initial updates
  updateLayout();
  window.addEventListener("DOMContentLoaded", updateLayout);
  window.addEventListener("load", updateLayout);
  window.addEventListener("resize", debouncedUpdateLayout);

  // Setup ResizeObserver with a more selective approach
  const observer = new ResizeObserver((entries) => {
    // Only trigger update if size actually changed
    const hasSignificantChange = entries.some((entry) => {
      const { width, height } = entry.contentRect;
      // Store previous dimensions in the element's dataset
      const element = entry.target as HTMLElement;
      const prevWidth = parseFloat(element.dataset.prevWidth || "0");
      const prevHeight = parseFloat(element.dataset.prevHeight || "0");

      // Check if change is significant (more than 1px)
      const hasChanged = Math.abs(width - prevWidth) > 1 || Math.abs(height - prevHeight) > 1;

      // Update stored dimensions
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

  // Only observe the main containers, not their children
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
