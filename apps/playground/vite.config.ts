import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const playgroundRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(playgroundRoot, "../..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@examples": path.resolve(repoRoot, "examples"),
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [repoRoot],
    },
  },
});
