import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Toaster } from "@/components/ui/sonner";
import { AvisoVersion } from "./AvisoVersion";
import { BotonEnviar } from "@/features/auth/components/BotonEnviar";
import { FranjaSinConexion } from "./FranjaSinConexion";

const ponerRed = (enLinea: boolean) =>
  act(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => enLinea });
    window.dispatchEvent(new Event(enLinea ? "online" : "offline"));
  });

afterEach(() => ponerRed(true));

describe("franja sin conexión", () => {
  it("aparece sin red y se oculta al volver la señal", () => {
    render(<FranjaSinConexion />);
    expect(screen.queryByText(/Sin conexión/)).not.toBeInTheDocument();

    ponerRed(false);
    expect(screen.getByText(/Sin conexión/)).toBeInTheDocument();
    expect(screen.getByText(/queda en pausa/)).toBeInTheDocument();

    ponerRed(true);
    expect(screen.queryByText(/Sin conexión/)).not.toBeInTheDocument();
  });

  it("sin red, los botones que envían al servidor quedan deshabilitados", () => {
    render(
      <BotonEnviar enviando={false} textoEnviando="Enviando…">
        Enviar
      </BotonEnviar>,
    );
    ponerRed(false);
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    ponerRed(true);
    expect(screen.getByRole("button", { name: "Enviar" })).toBeEnabled();
  });
});

describe("aviso de versión nueva", () => {
  it("no aparece si no hay versión nueva", () => {
    render(
      <>
        <Toaster />
        <AvisoVersion />
      </>,
    );
    expect(screen.queryByText("Hay una versión nueva")).not.toBeInTheDocument();
  });

  it("aparece con Actualizar, y solo actualiza al tocarlo", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { addEventListener: vi.fn() },
    });
    const updateServiceWorker = vi.fn();
    vi.mocked(useRegisterSW).mockReturnValue({
      needRefresh: [true, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker,
    });
    render(
      <>
        <Toaster />
        <AvisoVersion />
      </>,
    );

    expect(await screen.findByText("Hay una versión nueva")).toBeInTheDocument();
    expect(updateServiceWorker).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
