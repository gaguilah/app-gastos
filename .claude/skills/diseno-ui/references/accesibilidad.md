# Lista de accesibilidad e idiomas

Pásala en cada pantalla antes de entregarla. La capa de pruebas "Accesibilidad e idiomas" (skill `pruebas`) automatiza parte de esto.

## Contraste y color
- [ ] Texto normal con contraste ≥ 4.5:1 y texto grande o íconos con ≥ 3:1 (WCAG 2.2 AA), en modo claro y en modo oscuro.
- [ ] Ningún dato se comunica solo con color: el estado del presupuesto lleva porcentaje y texto; los ingresos llevan el signo `+`.
- [ ] El foco es visible en todos los elementos interactivos (`--ring`).

## Estructura
- [ ] Un solo `h1` por pantalla y encabezados sin saltar niveles.
- [ ] Regiones con `header`, `nav`, `main` y una etiqueta en cada `nav`.
- [ ] Tablas con `th` y `scope`; en móvil las tarjetas mantienen el orden de lectura.
- [ ] Los diálogos atrapan el foco y lo devuelven al cerrar (los de shadcn ya lo hacen; no los reemplaces).

## Formularios
- [ ] Cada campo tiene `label` visible; el placeholder no reemplaza a la etiqueta.
- [ ] Errores junto al campo, asociados con `aria-describedby`, y anunciados (`aria-live` o el mensaje de error de shadcn `FormMessage`).
- [ ] Teclado adecuado en móvil: `inputMode="numeric"` para montos, `type="email"` para correo.
- [ ] Los montos aceptan "35000", "35.000" y "$35.000" y se guardan como entero.

## Íconos e imágenes
- [ ] Íconos que actúan solos (botón de editar, borrar) tienen `aria-label` traducido.
- [ ] Íconos decorativos con `aria-hidden="true"`.
- [ ] Cada gráfica tiene un título y un resumen en texto o una tabla alternativa con los mismos datos.

## Movimiento y tamaño
- [ ] Animaciones respetan `prefers-reduced-motion`.
- [ ] La pantalla funciona con zoom de texto al 200 % sin cortar contenido.
- [ ] Áreas táctiles de al menos 44 × 44 px.

## Idiomas
- [ ] Ningún texto visible está escrito en el componente: todo sale de los archivos de traducción (`es` y `en`).
- [ ] `lang` del documento cambia con el idioma elegido.
- [ ] Plurales con la función de plurales de la librería de traducción ("1 gasto", "3 gastos").
- [ ] Fechas y números con `Intl` según el idioma; la moneda siempre COP.
- [ ] El texto más largo (normalmente español) no se desborda ni se corta.
