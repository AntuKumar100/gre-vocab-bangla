import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Relative base so the build works from any folder or a GitHub Pages subpath.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "GRE Vocab — Bangla",
        short_name: "GRE Vocab",
        description: "GregMAT GRE words with Bangla meanings, stories and spaced repetition",
        theme_color: "#2a78d6",
        background_color: "#f5f4f0",
        display: "standalone",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,json}"],
        globIgnores: ["audio/**"],
        runtimeCaching: [
          {
            // Matches the cache name the "Download all story audio" button fills.
            urlPattern: /\/audio\/.*\.mp3$/,
            handler: "CacheFirst",
            options: {
              cacheName: "story-audio",
              rangeRequests: true,
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "fonts", cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
});
