import { totalesIngresos, type Ingreso } from "./ingresos";

const ingreso = (valor: number, bolsaId: string | null, extra: Partial<Ingreso> = {}) =>
  ({
    valor,
    bolsaId,
    cuentaEstadisticas: true,
    esSalario: false,
    montoPresupuesto: null,
    sumaPresupuesto: false,
    ...extra,
  }) as Ingreso;

describe("totalesIngresos", () => {
  it("el salario suma su parte, un ingreso que suma todo, y no cuenta el dinero de un préstamo", () => {
    expect(
      totalesIngresos([
        ingreso(4_200_000, null, { esSalario: true, montoPresupuesto: 3_000_000 }),
        ingreso(350_000, "neq", { sumaPresupuesto: true }),
        ingreso(100_000, "efe"),
        ingreso(50_000, null),
        ingreso(1_000_000, "neq", { cuentaEstadisticas: false, sumaPresupuesto: true }),
      ]),
    ).toEqual({ total: 4_700_000, presupuesto: 3_350_000, bolsas: 450_000 });
  });
});
