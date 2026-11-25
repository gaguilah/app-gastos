import { supabase } from "./supabase";
import { crearClienteConsultas, limpiarAlCerrarSesion } from "./consultas";

describe("limpiarAlCerrarSesion", () => {
  it("al cerrar sesión borra la caché de datos", () => {
    let avisar: (evento: string) => void = () => {};
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementationOnce((cb) => {
      avisar = (evento) => cb(evento as Parameters<typeof cb>[0], null);
      return { data: { subscription: { unsubscribe: vi.fn() } } } as unknown as ReturnType<
        typeof supabase.auth.onAuthStateChange
      >;
    });
    const cliente = crearClienteConsultas();
    cliente.setQueryData(["lugares"], [{ id: "1" }]);
    limpiarAlCerrarSesion(cliente);

    avisar("TOKEN_REFRESHED");
    expect(cliente.getQueryData(["lugares"])).toBeDefined();
    avisar("SIGNED_OUT");
    expect(cliente.getQueryData(["lugares"])).toBeUndefined();
  });
});
