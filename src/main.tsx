import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import "./index.css";
import { PaginaVacia } from "./routes/PaginaVacia";

const raiz = document.getElementById("root");
if (!raiz) throw new Error("Falta el elemento #root");

createRoot(raiz).render(
  <StrictMode>
    <PaginaVacia />
  </StrictMode>,
);
