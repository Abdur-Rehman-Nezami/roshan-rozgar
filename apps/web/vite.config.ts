import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@roshan/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url),
      ),
    },
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8080",
      "/healthz": "http://127.0.0.1:8080",
      "/readyz": "http://127.0.0.1:8080",
      "/socket.io": { target: "http://127.0.0.1:8080", ws: true },
      "/uploads": "http://127.0.0.1:8080",
      "/tts": "http://127.0.0.1:8080",
    },
  },
});
