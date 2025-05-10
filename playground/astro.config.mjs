import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";

export default defineConfig({
  output: "server",
  prefetch: true,
  adapter: node({
    mode: "standalone",
  }),
  image: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.tractstack.com",
      },
      {
        protocol: "https",
        hostname: "**.freewebpress.com",
      },
    ],
  },
  integrations: [react()],
  csrf: {
    exemptPaths: ["/storykeep/login", "/storykeep/logout"],
  },
});
