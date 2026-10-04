import { defineConfig } from "vite";

export default defineConfig({
  // npm run serve answers the API; npm run dev forwards to it.
  server: { proxy: { "/api": "http://localhost:3000" } },
  preview: { proxy: { "/api": "http://localhost:3000" } },
});
