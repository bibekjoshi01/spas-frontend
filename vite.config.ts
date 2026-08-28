import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    // Do not publish application source with production assets by default.
    sourcemap: false,
  },

  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },

  server: {
    port: 3000,
    strictPort: true,

    // Each college is served from its own subdomain, so the dev server has to
    // accept any *.localhost host rather than only "localhost".
    host: true,
    allowedHosts: [".localhost"],
  },

  preview: {
    port: 3000,
    allowedHosts: [".localhost"],
  },
})
