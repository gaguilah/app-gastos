import "@testing-library/jest-dom/vitest";
import i18n from "../i18n";

// Solo se simula la capa src/datos/ (skill pruebas). Cada prueba ajusta lo que necesite.
vi.mock("@/datos/supabase", () => ({
  llegoDesdeRecuperacion: false,
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

// jsdom no tiene service worker: por defecto no hay versión nueva. AvisoVersion.test cambia esto.
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: vi.fn(() => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  })),
}));

// jsdom no trae matchMedia. Por defecto, pantalla de computador; `ponerMovil(true)` simula el móvil.
let movil = false;
export const ponerMovil = (valor: boolean) => {
  movil = valor;
};
window.matchMedia = (consulta: string) =>
  ({
    matches: consulta.includes("max-width") ? movil : !movil,
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as MediaQueryList;
afterEach(() => ponerMovil(false));

// jsdom dice que el navegador está en inglés; las pruebas parten del idioma por defecto.
await i18n.changeLanguage("es");
