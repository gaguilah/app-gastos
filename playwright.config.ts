import { defineConfig, devices } from "@playwright/test";

const puerto = 4173;
// En entornos con un Chromium ya instalado (por ejemplo, la nube de Claude Code) se usa ese binario.
const chromiumPropio = process.env.PW_CHROMIUM_PATH
  ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
  : {};

// Un nombre de dispositivo mal escrito no debe pasar en silencio a una pantalla de computador.
function dispositivo(nombre: string) {
  const d = devices[nombre];
  if (!d) throw new Error(`Playwright no tiene el dispositivo "${nombre}"`);
  return d;
}

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
    { name: "movil", use: { ...dispositivo("iPhone 14") } },
    { name: "movil-android", use: { ...dispositivo("Pixel 7"), ...chromiumPropio } },
    {
      name: "tablet",
      // Playwright no trae «iPad Air»: un iPad con WebKit y el tamaño de DESIGN.md §3 (820 × 1180).
      use: { ...dispositivo("iPad Pro 11"), viewport: { width: 820, height: 1180 } },
    },
    {
      name: "computador",
      use: {
        ...dispositivo("Desktop Chrome"),
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
    // Supabase local por defecto (mismos valores públicos de .env.example).
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY:
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
        "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
    },
  },
});
