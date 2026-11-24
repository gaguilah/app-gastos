import "@testing-library/jest-dom/vitest";
import i18n from "../i18n";

// jsdom dice que el navegador está en inglés; las pruebas parten del idioma por defecto.
await i18n.changeLanguage("es");
