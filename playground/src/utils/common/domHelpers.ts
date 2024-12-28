export function smoothScrollToPane(
  thisPane: HTMLElement,
  offset: number = 20,
  updateInterval: number = 50
): NodeJS.Timeout | undefined {
  const viewportHeight = window.innerHeight;
  const viewportTop = window.scrollY;
  const viewportBottom = viewportTop + viewportHeight;
  const paneTop = thisPane.offsetTop;
  const PROXIMITY_THRESHOLD = viewportHeight;

  const timeout = setTimeout(() => {
    if (Math.abs(paneTop - viewportBottom) < PROXIMITY_THRESHOLD) {
      thisPane.classList.add("motion-safe:animate-fadeInUp");

      window.scrollTo({
        top: paneTop - offset,
        behavior: "smooth",
      });
    }
  }, updateInterval);

  return timeout;
}
