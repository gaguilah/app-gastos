# Dinero, fechas y nombres

## Dinero (COP)
- Siempre **pesos enteros**. `35000` es $35.000. No existen centavos en la app.
- Entrada del usuario: se aceptan "35000", "35.000", "$35.000" y "35 000"; se limpia todo lo que no sea dígito y se valida que sea un entero positivo dentro de un máximo razonable.
- Salida: un único helper `formatearPesos(valor)` basado en `Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })` y otro abreviado para ejes de gráficas. Nadie formatea montos a mano.
- Porcentajes del presupuesto: se calculan con enteros (`Math.floor(gastado * 100 / presupuesto)`) para que los umbrales 70, 75, … 100 no dependan de redondeos de coma flotante.
- Fórmula del disponible (3.1): `presupuesto + ingresos con destino presupuesto − gastos que afectan el presupuesto`. Vive en un solo lugar de `dominio/`.

## Fechas
- Zona horaria de negocio: **`America/Bogota`** (UTC−5, sin horario de verano). "Hoy" es la fecha en Bogotá, no en UTC: un gasto a las 8 p. m. no debe caer en el día siguiente.
- Fechas de calendario como texto ISO `YYYY-MM-DD` (tipo `date` en Postgres). No uses `new Date("2026-03-15")` para fechas de calendario (se interpreta en UTC); usa funciones que trabajen con año, mes y día.
- **Reloj inyectable**: el dominio nunca llama `Date.now()` ni `new Date()` sin parámetros. Recibe `hoy` como argumento; en la UI se obtiene de un único `reloj.hoy()`.

## Período (3.1)
- `calcularPeriodo(hoy, diaInicio)` devuelve inicio y fin. Con `diaInicio = 1`: del 1 al fin de mes. Con `diaInicio = 15`: del 15 al 14 del mes siguiente.
- Si `diaInicio` no existe en el mes (29, 30, 31 en febrero o en meses de 30 días), el período empieza el último día de ese mes. La especificación de la Etapa 3 debe confirmar esta regla; es un supuesto hasta entonces.
- Cambiar el día de inicio aplica desde el próximo período; el período abierto no se recorta.

## Periódicos (3.6)
- Próxima fecha a partir de la regla (frecuencia, intervalo, día) y la última fecha generada, nunca sumando días a "hoy".
- Día 31 en meses cortos → último día del mes. 29 de febrero en años no bisiestos → 28 de febrero.
- Fechas atrasadas: al procesar un día, se generan todas las fechas pendientes hasta hoy, sin duplicar (restricción `unique (regla_id, fecha_programada)`).
- Mensual cuenta desde la fecha de inicio de la regla (por ejemplo, el 31 de enero → 28/29 feb → 31 mar), no desde la última fecha ajustada, para no quedarse corrido en el 28.

## Deudas (3.8)
- Interés total = total a pagar − valor recibido. Saldo pendiente = total a pagar − cuotas pagadas − abonos extraordinarios.
- Si las cuotas fijas no cuadran exactamente con el total, la diferencia va en la última cuota (regla a confirmar en la especificación de la Etapa 9).
- Solo la cuota pagada en el período afecta el presupuesto, y solo si la deuda tiene "afecta presupuesto = sí".

## Normalización de nombres (3.9)
- `normalizarNombre(texto)`: `trim` → minúsculas → `normalize("NFD")` y quitar marcas diacríticas → colapsar espacios internos a uno. "  ÉXITO  Calle 80 " → "exito calle 80".
- Se guarda el nombre visible tal como lo escribió el usuario por primera vez y el normalizado para la restricción única.
- La "ñ" también pierde su tilde al normalizar (n): es aceptable para comparar, porque el nombre visible la conserva.
- Las sugerencias de nombres parecidos usan distancia de edición sobre el nombre normalizado (por ejemplo, `pg_trgm` en la base o una función simple en `dominio/`).
