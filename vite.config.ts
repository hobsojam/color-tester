import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// GitHub Pages serves project sites from /<repo-name>/, so asset URLs need
// that base path baked in at build time.
export default defineConfig({
  base: "/color-tester/",
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        color: fileURLToPath(new URL("./color.html", import.meta.url)),
        hearing: fileURLToPath(new URL("./hearing.html", import.meta.url)),
      },
    },
  },
});
