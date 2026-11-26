import { totalesIngresos, type Ingreso } from "./ingresos";

const ingreso = (valor: number, bolsaId: string | null, cuentaEstadisticas = true) =>
  ({ valor, bolsaId, cuentaEstadisticas }) as Ingreso;

describe("totalesIngresos", () => {
  it("separa presupuesto y bolsas, y no cuenta el dinero de un préstamo", () => {
    expect(
      totalesIngresos([
        ingreso(4_200_000, null),
        ingreso(350_000, "neq"),
        ingreso(100_000, "efe"),
        ingreso(1_000_000, "neq", false),
      ]),
    ).toEqual({ total: 4_650_000, presupuesto: 4_200_000, bolsas: 450_000 });
  });
});
