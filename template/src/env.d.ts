/// <reference path="../.astro/types.d.ts" />

interface Window {
  dataLayer: any[];
  gtag: (...args: any[]) => void;
}

interface ImportMetaEnv {
  readonly PUBLIC_GOOGLE_SITE_VERIFICATION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
