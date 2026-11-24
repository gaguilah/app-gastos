import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import "./i18n";
import "./index.css";
import { SesionProvider } from "./features/auth/SesionProvider";
import { crearRouter } from "./routes/router";

const raiz = document.getElementById("root");
if (!raiz) throw new Error("Falta el elemento #root");

const router = crearRouter();

createRoot(raiz).render(
  <StrictMode>
    <SesionProvider>
      <RouterProvider router={router} />
    </SesionProvider>
  </StrictMode>,
);
