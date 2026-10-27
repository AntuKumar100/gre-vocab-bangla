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
      // Registered in main.tsx, and only on the website.
      injectRegister: false,
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Shobdo Quest: GRE® vocabulary in Bangla",
        short_name: "Shobdo Quest",
        description: "1,110 GRE® words with Bangla meanings, narrated stories, GRE-style questions and spaced repetition",
        theme_color: "#7c3aed",
        background_color: "#faf7ff",
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
        globPatterns: ["**/*.{js,css,html,svg,png,json,woff2}"],
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
        ],
      },
    }),
  ],
});
