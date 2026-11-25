import { useSyncExternalStore } from "react";

const suscribir = (aviso: () => void) => {
  window.addEventListener("online", aviso);
  window.addEventListener("offline", aviso);
  return () => {
    window.removeEventListener("online", aviso);
    window.removeEventListener("offline", aviso);
  };
};

/** false mientras el navegador dice que no hay red. */
export const useEnLinea = () => useSyncExternalStore(suscribir, () => navigator.onLine);
