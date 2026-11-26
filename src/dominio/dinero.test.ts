import { describe, expect, it } from "vitest";
import { formatearPesos, leerPesos, porcentajeUsado, umbralAlerta } from "./dinero";

describe("formatearPesos", () => {
  it("usa puntos de miles y el signo pegado, sin decimales", () => {
    expect(formatearPesos(2845000)).toBe("$2.845.000");
    expect(formatearPesos(7300)).toBe("$7.300");
    expect(formatearPesos(500)).toBe("$500");
    expect(formatearPesos(0)).toBe("$0");
  });

  it("los negativos llevan el signo menos tipográfico", () => {
    expect(formatearPesos(-7300)).toBe("−$7.300");
  });

  it("con signo, los positivos llevan +", () => {
    expect(formatearPesos(350000, { signo: true })).toBe("+$350.000");
    expect(formatearPesos(-28000, { signo: true })).toBe("−$28.000");
    expect(formatearPesos(0, { signo: true })).toBe("$0");
  });
});

describe("leerPesos", () => {
  it("acepta dígitos con puntos, espacios y el signo $", () => {
    expect(leerPesos("2.845.000")).toBe(2845000);
    expect(leerPesos("$ 35000")).toBe(35000);
    expect(leerPesos(" 35 000 ")).toBe(35000);
    expect(leerPesos("0")).toBe(0);
  });

  it("rechaza decimales, letras y vacío", () => {
    expect(leerPesos("12,5")).toBeNull();
    expect(leerPesos("12.5")).toBeNull();
    expect(leerPesos("abc")).toBeNull();
    expect(leerPesos("")).toBeNull();
    expect(leerPesos("$")).toBeNull();
  });

  it("rechaza negativos salvo que se permitan", () => {
    expect(leerPesos("-100.000")).toBeNull();
    expect(leerPesos("-100.000", { negativo: true })).toBe(-100000);
    expect(leerPesos("−100.000", { negativo: true })).toBe(-100000);
  });

  it("rechaza montos por encima del máximo", () => {
    expect(leerPesos("100.000.000.000")).toBe(100_000_000_000);
    expect(leerPesos("100.000.000.001")).toBeNull();
  });
});

describe("porcentajeUsado", () => {
  it("es entero hacia abajo, como las alertas en SQL", () => {
    expect(porcentajeUsado(1984500, 3200000)).toBe(62);
    expect(porcentajeUsado(1984500, 3400000)).toBe(58);
    expect(porcentajeUsado(699999, 1000000)).toBe(69);
    expect(porcentajeUsado(3104000, 3000000)).toBe(103);
  });

  it("con base 0 es 0", () => {
    expect(porcentajeUsado(5000, 0)).toBe(0);
  });
});

describe("umbralAlerta", () => {
  it("es nulo por debajo del 70 %", () => {
    expect(umbralAlerta(69)).toBeNull();
  });

  it("toma el último umbral alcanzado, de 5 en 5", () => {
    expect(umbralAlerta(70)).toBe("70");
    expect(umbralAlerta(74)).toBe("70");
    expect(umbralAlerta(91)).toBe("90");
    expect(umbralAlerta(100)).toBe("100");
  });

  it("por encima del 100 % es superado", () => {
    expect(umbralAlerta(101)).toBe("superado");
  });
});
