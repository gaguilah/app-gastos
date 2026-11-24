import "@testing-library/jest-dom/vitest";
import i18n from "../i18n";

// Solo se simula la capa src/datos/ (skill pruebas). Cada prueba ajusta lo que necesite.
vi.mock("@/datos/supabase", () => ({
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

// jsdom dice que el navegador está en inglés; las pruebas parten del idioma por defecto.
await i18n.changeLanguage("es");
