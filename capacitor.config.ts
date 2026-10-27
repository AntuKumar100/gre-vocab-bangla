import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.github.antukumar100.shobdoquest",
  appName: "Shobdo Quest",
  webDir: "dist",
  android: {
    // Plum behind the web view while it starts, matching the icon.
    backgroundColor: "#1e1035",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_parrot",
      iconColor: "#ec4899",
    },
  },
};

export default config;
