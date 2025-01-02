import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import prefetch from "@astrojs/prefetch";
import react from "@astrojs/react";

export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  image: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.tractstack.com",
      },
    ],
  },
  integrations: [react(), prefetch()],
});
