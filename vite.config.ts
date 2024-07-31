import { defineConfig } from "vite";
import { resolve } from "path";
import polyfillNode from "rollup-plugin-polyfill-node";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "library",
      fileName: (format) => `library.${format}.js`,
    },
    rollupOptions: {
      external: ["child_process", "util", "fs/promises", "path"],
      output: {
        globals: {},
      },
      plugins: [polyfillNode()],
    },
  },
});
