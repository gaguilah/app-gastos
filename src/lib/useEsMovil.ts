import { useSyncExternalStore } from "react";

// Mismo corte que `md:` en Tailwind y DESIGN.md §3: móvil por debajo de 768 px.
const consulta = "(max-width: 767.98px)";

const suscribir = (aviso: () => void) => {
  const lista = window.matchMedia(consulta);
  lista.addEventListener("change", aviso);
  return () => lista.removeEventListener("change", aviso);
};

export const useEsMovil = () =>
  useSyncExternalStore(suscribir, () => window.matchMedia(consulta).matches);
