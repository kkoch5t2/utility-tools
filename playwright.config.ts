import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4399" },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4399",
    url: "http://127.0.0.1:4399",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
