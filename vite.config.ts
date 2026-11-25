/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

const { version } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as {
  version: string;
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt": la versión nueva espera a que la persona toque Actualizar (AvisoVersion).
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "App-Gastos",
        short_name: "App-Gastos",
        description: "Gastos personales y presupuesto por período, en pesos colombianos.",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        // Los mismos valores que --primary y --background de src/index.css (DESIGN.md §2).
        theme_color: "#047857",
        background_color: "#f6f8f7",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // El shell completo, fuentes incluidas, para abrir sin red.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        // Sin esto, en la primera visita (página aún sin service worker) Actualizar no recargaría.
        clientsClaim: true,
      },
    }),
  ],
  // La versión que muestra Ajustes sale de package.json.
  define: { __VERSION_APP__: JSON.stringify(version) },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
