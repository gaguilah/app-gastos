import { render, screen } from "@testing-library/react";
import i18n from "../i18n";
import { PaginaVacia } from "./PaginaVacia";

describe("PaginaVacia", () => {
  afterEach(() => i18n.changeLanguage("es"));

  it("muestra el nombre y el aviso en español por defecto", async () => {
    await i18n.changeLanguage("es");
    render(<PaginaVacia />);
    expect(screen.getByRole("heading", { level: 1, name: "App-Gastos" })).toBeVisible();
    expect(screen.getByText("Estamos preparando tu app de gastos.")).toBeVisible();
    expect(document.documentElement.lang).toBe("es");
  });

  it("muestra los textos en inglés y cambia el lang del documento", async () => {
    await i18n.changeLanguage("en");
    render(<PaginaVacia />);
    expect(screen.getByText("We are getting your expense app ready.")).toBeVisible();
    expect(document.documentElement.lang).toBe("en");
  });
});
