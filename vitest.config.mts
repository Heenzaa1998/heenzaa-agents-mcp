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
    // The default 5s flaked on slow runs (tests that take ~10ms timed out while
    // the machine was busy); 15s still catches a genuinely hung test.
    testTimeout: 15_000,
  },
});
