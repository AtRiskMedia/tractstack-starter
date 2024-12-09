declare global {
  interface Window {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

window.dataLayer = window.dataLayer || [];
/* eslint-disable @typescript-eslint/no-explicit-any */
function gtag(...args: any[]) {
  window.dataLayer.push(args);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
(window as any).gtag = gtag;

export {};
