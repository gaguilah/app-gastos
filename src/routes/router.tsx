import { createBrowserRouter, type RouteObject } from "react-router";
import { RutaProtegida } from "@/features/auth/components/RutaProtegida";
import { SoloSinSesion } from "@/features/auth/components/SoloSinSesion";
import { CargandoApp } from "@/components/shared/CargandoApp";
import { LayoutApp } from "./LayoutApp";
import { modulos } from "./rutas";

export type DatosRuta = { titulo: string };

// Cada etapa reemplaza la pantalla "En construcción" de su módulo.
const enConstruccion = () => ({
  Component: async () => (await import("./EnConstruccion")).EnConstruccion,
});

// Función y no constante: el router completa los objetos de ruta al cargarlos en diferido.
export const crearRutas = (): RouteObject[] => [
  {
    HydrateFallback: CargandoApp,
    children: [
      {
        Component: SoloSinSesion,
        children: [
          { path: "/login", lazy: { Component: async () => (await import("./Login")).Login } },
          {
            path: "/recuperar",
            lazy: { Component: async () => (await import("./Recuperar")).Recuperar },
          },
        ],
      },
      {
        // Pública, pero solo funciona con la sesión que abre el enlace del correo.
        path: "/nueva-contrasena",
        lazy: { Component: async () => (await import("./NuevaContrasena")).NuevaContrasena },
      },
      {
        Component: RutaProtegida,
        children: [
          {
            Component: LayoutApp,
            children: [
              ...modulos.map(({ ruta, titulo }) => ({
                path: ruta,
                handle: { titulo } satisfies DatosRuta,
                lazy: enConstruccion(),
              })),
              {
                path: "/ajustes",
                lazy: { Component: async () => (await import("./Ajustes")).Ajustes },
              },
              { path: "/mas", lazy: { Component: async () => (await import("./Mas")).Mas } },
              {
                path: "*",
                lazy: { Component: async () => (await import("./NoEncontrada")).NoEncontrada },
              },
            ],
          },
        ],
      },
    ],
  },
];

export const crearRouter = () => createBrowserRouter(crearRutas());
