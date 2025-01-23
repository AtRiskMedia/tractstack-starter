// utils/storykeep/layout.ts
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
  function updateLayout() {
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
  }

  // Initial updates
  updateLayout();
  window.addEventListener("DOMContentLoaded", updateLayout);
  window.addEventListener("load", updateLayout);
  window.addEventListener("resize", updateLayout);

  // Setup ResizeObserver
  const observer = new ResizeObserver(updateLayout);
  ["mainHeader", "mainNav", "toolbarNav"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      observer.observe(element);
      element.querySelectorAll("*").forEach((child) => {
        observer.observe(child);
      });
    }
  });

  // Return cleanup function
  return () => {
    window.removeEventListener("DOMContentLoaded", updateLayout);
    window.removeEventListener("load", updateLayout);
    window.removeEventListener("resize", updateLayout);
    observer.disconnect();
  };
}
