import { diaBogota, fechaCorta, rangoPeriodo } from "./fechas";

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

describe("rangoPeriodo", () => {
  it("en el mismo mes escribe el mes una vez", () => {
    expect(rangoPeriodo("2026-11-01", "2026-11-30", "es")).toBe("1 – 30 nov 2026");
    expect(rangoPeriodo("2026-11-01", "2026-11-30", "en")).toBe("Nov 1 – 30, 2026");
  });

  it("entre dos meses del mismo año escribe los dos meses", () => {
    expect(rangoPeriodo("2026-10-15", "2026-11-14", "es")).toBe("15 oct – 14 nov 2026");
    expect(rangoPeriodo("2026-10-15", "2026-11-14", "en")).toBe("Oct 15 – Nov 14, 2026");
  });

  it("entre dos años escribe los dos años", () => {
    expect(rangoPeriodo("2026-12-15", "2027-01-14", "es")).toBe("15 dic 2026 – 14 ene 2027");
    expect(rangoPeriodo("2026-12-15", "2027-01-14", "en")).toBe("Dec 15, 2026 – Jan 14, 2027");
  });

  it("septiembre queda en tres letras", () => {
    expect(rangoPeriodo("2026-09-01", "2026-09-30", "es")).toBe("1 – 30 sep 2026");
  });
});
