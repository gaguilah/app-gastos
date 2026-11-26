import type { Periodo } from "@/datos/presupuesto";
import { estadoPeriodo } from "./estado";

const periodo = (usado: number, base = 1000): Periodo => ({
  id: "p",
  inicio: "2026-11-01",
  fin: "2026-11-30",
  presupuesto: base,
  ingresosPresupuesto: 0,
  base,
  usado,
  disponible: base - usado,
  cerrado: false,
  nota: null,
});

describe("estadoPeriodo", () => {
  it("con los umbrales de las alertas: < 70, 70–100 y > 100", () => {
    expect(estadoPeriodo(periodo(699), false)).toBe("dentro");
    expect(estadoPeriodo(periodo(700), false)).toBe("advertencia");
    expect(estadoPeriodo(periodo(1000), false)).toBe("advertencia");
    expect(estadoPeriodo(periodo(1010), false)).toBe("superado");
  });

  it("el período en curso dice «En curso» salvo que esté superado", () => {
    expect(estadoPeriodo(periodo(900), true)).toBe("enCurso");
    expect(estadoPeriodo(periodo(1010), true)).toBe("superado");
  });
});
