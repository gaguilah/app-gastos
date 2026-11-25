import { useSyncExternalStore } from "react";

// Mismo corte que `xl:` en Tailwind y DESIGN.md §3: computador desde 1280 px.
const consulta = "(min-width: 1280px)";

const suscribir = (aviso: () => void) => {
  const lista = window.matchMedia(consulta);
  lista.addEventListener("change", aviso);
  return () => lista.removeEventListener("change", aviso);
};

export const useEsComputador = () =>
  useSyncExternalStore(suscribir, () => window.matchMedia(consulta).matches);
