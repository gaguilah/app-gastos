import { act, render, screen } from "@testing-library/react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/datos/supabase";
import { SesionProvider } from "./SesionProvider";
import { useSesion } from "./useSesion";

type Aviso = (evento: AuthChangeEvent, sesion: Session | null) => void;
const sesion = { user: { id: "u1" } } as Session;
let avisar: Aviso = () => {};

function Estado() {
  const { cargando, sesion, recuperando } = useSesion();
  return (
    <p>
      {cargando
        ? "cargando"
        : `${sesion ? "con" : "sin"} sesión · ${recuperando ? "recuperando" : "normal"}`}
    </p>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((aviso) => {
    avisar = aviso as Aviso;
    return { data: { subscription: { id: "s", callback: aviso, unsubscribe: vi.fn() } } };
  });
});

const montar = () =>
  render(
    <SesionProvider>
      <Estado />
    </SesionProvider>,
  );

describe("SesionProvider", () => {
  it("la recuperación vale aunque la sesión inicial llegue antes que PASSWORD_RECOVERY", () => {
    montar();
    act(() => avisar("PASSWORD_RECOVERY", sesion));
    act(() => avisar("INITIAL_SESSION", sesion));
    expect(screen.getByText("con sesión · recuperando")).toBeInTheDocument();
  });

  it("sobrevive a una recarga de la pestaña hasta guardar la contraseña", () => {
    const { unmount } = montar();
    act(() => avisar("PASSWORD_RECOVERY", sesion));
    unmount();

    montar(); // recarga: el evento ya no vuelve a llegar
    act(() => avisar("INITIAL_SESSION", sesion));
    expect(screen.getByText("con sesión · recuperando")).toBeInTheDocument();

    act(() => avisar("USER_UPDATED", sesion));
    expect(screen.getByText("con sesión · normal")).toBeInTheDocument();
    expect(sessionStorage.length).toBe(0);
  });

  it("sin sesión no hay recuperación", () => {
    sessionStorage.setItem("app-gastos.recuperando", "1");
    montar();
    act(() => avisar("INITIAL_SESSION", null));
    expect(screen.getByText("sin sesión · normal")).toBeInTheDocument();
  });
});
