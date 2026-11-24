import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { AuthApiError, type Session } from "@supabase/supabase-js";
import { supabase } from "@/datos/supabase";
import { SesionContext, type EstadoSesion } from "@/features/auth/contexto";
import { crearRutas } from "./router";

const auth = vi.mocked(supabase.auth);
const sesionFalsa = { user: { id: "u1" } } as Session;

function abrir(ruta: string, estado: Partial<EstadoSesion> = {}) {
  const router = createMemoryRouter(crearRutas(), { initialEntries: [ruta] });
  render(
    <SesionContext value={{ cargando: false, sesion: null, recuperando: false, ...estado }}>
      <RouterProvider router={router} />
    </SesionContext>,
  );
  return router;
}

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

beforeEach(() => vi.clearAllMocks());

describe("Login", () => {
  it("no tiene registro: solo correo, contraseña y el enlace de recuperación", async () => {
    abrir("/login");
    await screen.findByRole("heading", { name: "Iniciar sesión" });
    expect(screen.getByLabelText("Correo")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
    expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "¿Olvidaste tu contraseña?",
    ]);
  });

  it("con credenciales incorrectas muestra un solo mensaje y marca los dos campos", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError("Invalid login credentials", 400, "invalid_credentials"),
    });
    abrir("/login");
    await screen.findByLabelText("Correo");
    escribir("Correo", " usuario-a@prueba.local ");
    escribir("Contraseña", "mala");
    fireEvent.submit(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El correo o la contraseña no coinciden.",
    );
    expect(screen.getByLabelText("Correo")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("aria-invalid", "true");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "usuario-a@prueba.local",
      password: "mala",
    });
  });

  it("mientras inicia sesión, el botón dice Iniciando sesión… y no envía dos veces", async () => {
    let terminar: () => void = () => {};
    auth.signInWithPassword.mockReturnValue(
      new Promise((r) => {
        terminar = () => r({ data: { user: null, session: null }, error: null } as never);
      }),
    );
    abrir("/login");
    await screen.findByLabelText("Correo");
    escribir("Correo", "usuario-a@prueba.local");
    escribir("Contraseña", "prueba-local-123");
    const formulario = screen.getByRole("button", { name: "Iniciar sesión" }).closest("form")!;
    fireEvent.submit(formulario);
    fireEvent.submit(formulario);

    const boton = await screen.findByRole("button", { name: "Iniciando sesión…" });
    expect(boton).toBeDisabled();
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1);
    terminar();
    await screen.findByRole("button", { name: "Iniciar sesión" });
  });

  it("el botón del ojo muestra y oculta la contraseña", async () => {
    abrir("/login");
    await screen.findByLabelText("Contraseña");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
  });
});

describe("Recuperar contraseña", () => {
  it("responde lo mismo aunque el correo no exista, y pide volver a /nueva-contrasena", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: new AuthApiError("User not found", 400, "user_not_found"),
    });
    abrir("/recuperar");
    await screen.findByLabelText("Correo");
    escribir("Correo", "nadie@prueba.local");
    fireEvent.submit(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Si el correo está registrado, te llegará un enlace",
    );
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("nadie@prueba.local", {
      redirectTo: `${window.location.origin}/nueva-contrasena`,
    });
  });

  it("avisa si alcanzó el límite de envíos", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: new AuthApiError("Rate limit", 429, "over_email_send_rate_limit"),
    });
    abrir("/recuperar");
    await screen.findByLabelText("Correo");
    escribir("Correo", "usuario-a@prueba.local");
    fireEvent.submit(screen.getByRole("button", { name: "Enviar enlace" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("muchos intentos");
  });

  it("con sesión abierta lleva a Inicio", async () => {
    const router = abrir("/recuperar", { sesion: sesionFalsa });
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  });
});

describe("Nueva contraseña", () => {
  it("sin el enlace del correo dice que venció y ofrece pedir otro", async () => {
    abrir("/nueva-contrasena");
    expect(await screen.findByRole("alert")).toHaveTextContent("El enlace venció o ya se usó.");
    expect(screen.getByRole("link", { name: "Pedir otro enlace" })).toHaveAttribute(
      "href",
      "/recuperar",
    );
  });

  it("valida longitud y confirmación antes de llamar a Supabase", async () => {
    abrir("/nueva-contrasena", { sesion: sesionFalsa, recuperando: true });
    await screen.findByLabelText("Contraseña nueva");
    escribir("Contraseña nueva", "corta");
    escribir("Confirma la contraseña", "corta");
    fireEvent.submit(screen.getByRole("button", { name: "Guardar contraseña" }));
    expect(
      await screen.findByText("La contraseña debe tener al menos 8 caracteres."),
    ).toBeVisible();
    expect(screen.getByLabelText("Contraseña nueva")).toHaveAttribute("aria-invalid", "true");

    escribir("Contraseña nueva", "abcdefgh");
    escribir("Confirma la contraseña", "abcdefgx");
    fireEvent.submit(screen.getByRole("button", { name: "Guardar contraseña" }));
    expect(await screen.findByText("Las contraseñas no coinciden.")).toBeVisible();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("guarda la contraseña y entra a Inicio", async () => {
    auth.updateUser.mockResolvedValue({ data: { user: null }, error: null } as never);
    const router = abrir("/nueva-contrasena", { sesion: sesionFalsa, recuperando: true });
    await screen.findByLabelText("Contraseña nueva");
    escribir("Contraseña nueva", "abcdefgh");
    escribir("Confirma la contraseña", "abcdefgh");
    fireEvent.submit(screen.getByRole("button", { name: "Guardar contraseña" }));
    await waitFor(() => expect(auth.updateUser).toHaveBeenCalledWith({ password: "abcdefgh" }));
    await waitFor(() => expect(router.state.location.pathname).not.toBe("/nueva-contrasena"));
  });

  it("con la sesión de recuperación, las rutas protegidas llevan a crear la contraseña", async () => {
    const router = abrir("/gastos", { sesion: sesionFalsa, recuperando: true });
    await screen.findByLabelText("Contraseña nueva");
    expect(router.state.location.pathname).toBe("/nueva-contrasena");
  });
});
