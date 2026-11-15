import { defineConfig, devices } from "@playwright/test";

const puerto = 4173;
// En entornos con un Chromium ya instalado (por ejemplo, la nube de Claude Code) se usa ese binario.
const chromiumPropio = process.env.PW_CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
  : {};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${puerto}`,
    locale: "es-CO",
    timezoneId: "America/Bogota",
    trace: "off",
  },
  // Los mismos tamaños de diseno-ui/references/layouts-3-tamanos.md.
  projects: [
    { name: "movil", use: { ...devices["iPhone 14"] } },
    { name: "movil-android", use: { ...devices["Pixel 7"], ...chromiumPropio } },
    { name: "tablet", use: { ...devices["iPad Air"] } },
    {
      name: "computador",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        ...chromiumPropio,
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${puerto} --strictPort`,
    url: `http://localhost:${puerto}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
