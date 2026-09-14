import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const srcPath = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": srcPath,
    },
  },
  test: {
    css: true,
    environment: "jsdom",
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
    maxWorkers: 1,
    pool: "threads",
    setupFiles: ["./vitest.setup.ts"],
  },
});
