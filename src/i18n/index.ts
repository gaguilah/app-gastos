import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "./es.json";
import en from "./en.json";

export const idiomas = ["es", "en"] as const;
export type Idioma = (typeof idiomas)[number];

/** Español por defecto; inglés solo si el navegador lo prefiere. */
export function idiomaInicial(preferidos: readonly string[]): Idioma {
  return preferidos[0]?.toLowerCase().startsWith("en") ? "en" : "es";
}

void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: idiomaInicial(typeof navigator === "undefined" ? [] : navigator.languages),
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});

const ponerLang = (lng: string) => document.documentElement.setAttribute("lang", lng);
ponerLang(i18n.language);
i18n.on("languageChanged", ponerLang);

export default i18n;
