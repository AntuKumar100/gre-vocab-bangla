import { defineConfig, devices } from "@playwright/test";

// End-to-end checks against the production build (npm run build first).
export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:4173/", serviceWorkers: "block" },
  webServer: { command: "npx vite preview --port 4173 --strictPort", url: "http://localhost:4173/", reuseExistingServer: true },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { viewport: { width: 1280, height: 860 } } },
  ],
});
