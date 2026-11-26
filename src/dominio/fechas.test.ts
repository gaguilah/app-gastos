import { diaBogota, fechaCorta } from "./fechas";

describe("diaBogota", () => {
  it("usa el día de Bogotá, no el de UTC", () => {
    // 03:00 UTC del 26 es todavía el 25 en Bogotá (UTC-5).
    expect(diaBogota(new Date("2026-11-26T03:00:00Z"))).toBe("2026-11-25");
    expect(diaBogota(new Date("2026-11-26T05:00:00Z"))).toBe("2026-11-26");
  });
});

describe("fechaCorta", () => {
  const hoy = "2026-11-25";
  it("hoy y ayer como palabras", () => {
    expect(fechaCorta("2026-11-25", hoy, "es")).toEqual({ clave: "fechas.hoy" });
    expect(fechaCorta("2026-11-24", hoy, "es")).toEqual({ clave: "fechas.ayer" });
    expect(fechaCorta("2026-12-01", "2026-12-02", "en")).toEqual({ clave: "fechas.ayer" });
  });

  it("del mismo año: día y mes corto según el idioma", () => {
    expect(fechaCorta("2026-11-13", hoy, "es")).toEqual({ texto: "13 nov" });
    expect(fechaCorta("2026-11-13", hoy, "en")).toEqual({ texto: "Nov 13" });
  });

  it("de otro año: agrega el año", () => {
    expect(fechaCorta("2025-06-14", hoy, "es")).toEqual({ texto: "14 jun 2025" });
    expect(fechaCorta("2025-06-14", hoy, "en")).toEqual({ texto: "Jun 14, 2025" });
  });
});
