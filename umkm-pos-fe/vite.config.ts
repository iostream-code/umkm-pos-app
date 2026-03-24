import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite 8: tsconfig paths didukung native, alias @ cukup dengan string '/src'
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
