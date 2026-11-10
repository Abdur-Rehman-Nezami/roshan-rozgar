import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    conditions: ["development"],
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
