import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { crearClienteConsultas } from "./consultas";
import { usePonerseAlDia } from "./ponerseAlDia";
import { supabase } from "./supabase";

const rpc = vi.fn();

function montar(conSesion: boolean) {
  const cliente = crearClienteConsultas();
  cliente.setQueryData(["bolsas"], []);
  const envoltura = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
  const vista = renderHook(({ hoy }) => usePonerseAlDia(conSesion, hoy), {
    wrapper: envoltura,
    initialProps: { hoy: "2026-11-25" },
  });
  return { cliente, ...vista };
}

describe("usePonerseAlDia", () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: { periodicos: 0 }, error: null });
    Object.assign(supabase, { rpc });
  });

  it("sin sesión no llama a la base de datos", () => {
    montar(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("con sesión llama ponerse_al_dia una vez por día y refresca lo que había en caché", async () => {
    const { cliente, rerender } = montar(true);
    await waitFor(() => expect(cliente.getQueryState(["bolsas"])?.isInvalidated).toBe(true));
    expect(rpc).toHaveBeenCalledExactlyOnceWith("ponerse_al_dia");
    rerender({ hoy: "2026-11-25" });
    expect(rpc).toHaveBeenCalledTimes(1);
    rerender({ hoy: "2026-11-26" });
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2));
  });
});
