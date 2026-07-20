import { defineConfig } from "vite";

// GitHub Pages serves project sites from /<repo-name>/, so asset URLs need
// that base path baked in at build time.
export default defineConfig({
  base: "/color-tester/",
});
