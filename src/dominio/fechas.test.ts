import { diaBogota, fechaCorta, fechaLarga, fechaPorPlazo, mesAnio, rangoPeriodo } from "./fechas";

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

describe("fechaLarga", () => {
  it("día de la semana con mayúscula inicial y la fecha completa", () => {
    expect(fechaLarga("2026-11-09", "es")).toBe("Lunes, 9 de noviembre de 2026");
    expect(fechaLarga("2026-11-09", "en")).toBe("Monday, November 9, 2026");
  });
});

describe("fechaPorPlazo", () => {
  it("suma días, semanas o meses a hoy", () => {
    expect(fechaPorPlazo("2026-11-26", 30, "dias")).toBe("2026-12-26");
    expect(fechaPorPlazo("2026-11-26", 4, "semanas")).toBe("2026-12-24");
    expect(fechaPorPlazo("2026-11-26", 12, "meses")).toBe("2027-11-26");
  });

  it("un mes sin ese día queda en su último día", () => {
    expect(fechaPorPlazo("2026-01-31", 1, "meses")).toBe("2026-02-28");
    expect(fechaPorPlazo("2027-12-31", 2, "meses")).toBe("2028-02-29");
  });
});

describe("mesAnio", () => {
  it("mes corto y año", () => {
    expect(mesAnio("2027-06-30", "es")).toBe("jun 2027");
    expect(mesAnio("2027-06-30", "en")).toBe("Jun 2027");
  });
});
