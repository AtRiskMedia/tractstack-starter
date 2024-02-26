import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import htmx from "astro-htmx";
import sitemap from "@astrojs/sitemap";
import { SITE } from "./src/config";
//import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  site: SITE.website,
  integrations: [
    htmx(),
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
    sitemap(),
  ],
  vite: {
    //plugins: [basicSsl()],
    //server: {
    //  https: true,
    //},
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  scopedStyleStrategy: "where",
});
