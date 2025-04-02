export function smoothScrollToPane(
  thisPane: HTMLElement,
  offset: number = 20,
  updateInterval: number = 50
): NodeJS.Timeout | undefined {
  const timeout = setTimeout(() => {
    setTimeout(() => {
      const viewportHeight = window.innerHeight;
      const viewportTop = window.scrollY;
      const viewportBottom = viewportTop + viewportHeight;
      const paneTop = thisPane.offsetTop;
      const PROXIMITY_THRESHOLD = viewportHeight;

      if (Math.abs(paneTop - viewportBottom) < PROXIMITY_THRESHOLD) {
        thisPane.classList.add("motion-safe:animate-fadeInUp");

        window.scrollTo({
          top: paneTop - offset,
          behavior: "smooth",
        });
      }
    }, 0);
  }, updateInterval);

  return timeout;
}

export function dispatchEvent(event: CustomEvent) {
  document.dispatchEvent(event);
}

export function dispatchUpdateVideoEvent(startTime: string, videoId?: string) {
  const event = new CustomEvent("updateVideo", {
    detail: { startTime, videoId },
  });
  dispatchEvent(event);
}
