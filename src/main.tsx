import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import "./i18n";
import "./index.css";
import { crearClienteConsultas, limpiarAlCerrarSesion } from "./datos/consultas";
import { SesionProvider } from "./features/auth/SesionProvider";
import { crearRouter } from "./routes/router";

const raiz = document.getElementById("root");
if (!raiz) throw new Error("Falta el elemento #root");

const router = crearRouter();
const clienteConsultas = crearClienteConsultas();
limpiarAlCerrarSesion(clienteConsultas);

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={clienteConsultas}>
      <SesionProvider>
        <RouterProvider router={router} />
      </SesionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
