import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "./es.json";
import en from "./en.json";

export const idiomas = ["es", "en"] as const;
export type Idioma = (typeof idiomas)[number];

const CLAVE_IDIOMA = "app-gastos.idioma";

const esIdioma = (valor: unknown): valor is Idioma => idiomas.includes(valor as Idioma);

/**
 * Manda el idioma guardado en el dispositivo (Ajustes). Sin él, español por defecto
 * e inglés solo si el navegador lo prefiere.
 */
export function idiomaInicial(preferidos: readonly string[], guardado?: string | null): Idioma {
  if (esIdioma(guardado)) return guardado;
  return preferidos[0]?.toLowerCase().startsWith("en") ? "en" : "es";
}

// El almacenamiento puede no existir o fallar (ventana privada, datos bloqueados).
function leerGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE_IDIOMA);
  } catch {
    return null;
  }
}

/** Cambia el idioma de toda la app y lo recuerda en este dispositivo. */
export async function cambiarIdioma(idioma: Idioma): Promise<void> {
  try {
    localStorage.setItem(CLAVE_IDIOMA, idioma);
  } catch {
    // Sin almacenamiento, el cambio dura hasta cerrar la app.
  }
  await i18n.changeLanguage(idioma);
}

void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: idiomaInicial(typeof navigator === "undefined" ? [] : navigator.languages, leerGuardado()),
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});

const ponerLang = (lng: string) => document.documentElement.setAttribute("lang", lng);
ponerLang(i18n.language);
i18n.on("languageChanged", ponerLang);

export default i18n;
