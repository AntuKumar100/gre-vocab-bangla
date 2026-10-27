import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import { isNative } from "./lib/native";
// Fonts ship with the app (Latin + Bengali subsets only): no Google request, works offline.
import "@fontsource/baloo-da-2/latin-500.css";
import "@fontsource/baloo-da-2/latin-600.css";
import "@fontsource/baloo-da-2/latin-700.css";
import "@fontsource/baloo-da-2/latin-800.css";
import "@fontsource/baloo-da-2/bengali-600.css";
import "@fontsource/baloo-da-2/bengali-800.css";
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import "@fontsource/nunito/latin-900.css";
import "@fontsource/hind-siliguri/bengali-400.css";
import "@fontsource/hind-siliguri/bengali-500.css";
import "@fontsource/hind-siliguri/bengali-600.css";
import "./styles.css";

// The website works offline through a service worker; the Android app already has every file.
if (!isNative) registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
