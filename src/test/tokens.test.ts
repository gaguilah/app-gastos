// DESIGN.md: ningún color, tamaño o radio fijo en los componentes; todo sale de src/index.css.
const codigo = Object.entries(
  import.meta.glob<string>(["/src/**/*.{ts,tsx}", "!/src/**/*.test.{ts,tsx}"], {
    query: "?raw",
    import: "default",
    eager: true,
  }),
).map(([ruta, texto]) => ({ ruta, texto }));

const fijos = [
  { regla: "color hexadecimal", patron: /#[0-9a-f]{3,8}\b/i },
  { regla: "color rgb/hsl", patron: /\b(rgba?|hsla?|oklch)\(/ },
  { regla: "medida en px o rem entre corchetes", patron: /-\[[\d.]+(px|rem|em)\]/ },
  {
    regla: "color de la paleta de Tailwind",
    patron: /\b(bg|text|border|ring|fill)-(black|white|gray|slate|red|green|blue|amber|emerald)\b/,
  },
];

describe("solo tokens de diseño", () => {
  it("revisa los archivos de src/", () => expect(codigo.length).toBeGreaterThan(10));

  it.each(fijos)("no hay $regla en src/", ({ patron }) => {
    const conFijos = codigo.filter(({ texto }) => patron.test(texto)).map(({ ruta }) => ruta);
    expect(conFijos).toEqual([]);
  });
});
