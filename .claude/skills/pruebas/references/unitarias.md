# Casos mínimos de las reglas de cálculo

Cada especificación puede agregar casos; estos son el piso. Todos con reloj fijo. Desde la Etapa 3 las reglas viven en SQL, así que estos casos se prueban con pgTAP en `supabase/tests/`; Vitest queda para lo de presentación.

## Período (3.1)
- Inicio 1: hoy 2026-02-10 → 2026-02-01 a 2026-02-28.
- Inicio 1 en bisiesto: hoy 2028-02-10 → 2028-02-01 a 2028-02-29.
- Inicio 15: hoy 2026-03-02 → 2026-02-15 a 2026-03-14; hoy 2026-03-15 → 2026-03-15 a 2026-04-14.
- Inicio 15 cruzando el año: hoy 2026-12-20 → 2026-12-15 a 2027-01-14.
- Inicio 31: en abril empieza el 30; en febrero, el 28 o 29 (confirmado en la Etapa 3).
- Disponible = presupuesto + ingresos a presupuesto − gastos que afectan el presupuesto; los ingresos a una bolsa no lo cambian.
- Gastos pendientes de confirmar no descuentan hasta confirmarse.

## Alertas (3.2)
- Gastado 69 % → ninguna; 70 % → 70; salto de 60 % a 86 % en un solo gasto → avisa 70, 75, 80 y 85 (o solo el mayor, según la especificación; debe quedar decidido).
- Un umbral ya avisado en el período no se repite.
- 100 % y "superado" son avisos distintos.
- Presupuesto 0: no divide por cero.

## Bolsas (3.4)
- Saldo = recargas + ingresos a la bolsa − gastos con origen en la bolsa ± ajustes.
- Recarga no afecta el presupuesto.
- Ajuste a un saldo real menor crea un gasto "Gasto desconocido" por la diferencia; ajuste a un saldo mayor (definir en la especificación).
- Saldo negativo permitido con advertencia.
- El saldo pasa al siguiente período sin reiniciarse.
- Canal Bre-B con origen Nequi descuenta de Nequi.

## Periódicos (3.6)
- Mensual el día 31: ene 31 → feb 28 (feb 29 en bisiesto) → mar 31 → abr 30.
- Anual el 29 de febrero en año no bisiesto → 28 de febrero.
- Cada N días/semanas/meses, quincenal, bimestral, trimestral.
- Con N repeticiones: no genera la N+1.
- Pausada: no genera; al reanudar, no genera las fechas del tiempo pausado (confirmar en la especificación).
- Atrasada 5 días: genera todas las pendientes una sola vez; correr dos veces no duplica.
- Editar la regla no cambia los gastos ya generados.

## Préstamos (3.7)
- Prestar descuenta del presupuesto y del origen.
- Pagos parciales: Pendiente → Parcial → Pagado; un pago mayor que el saldo se rechaza o se limita (definir).
- Cada pago es un ingreso "Cobro de préstamo" en el período en que llega.
- "No recuperado" no vuelve a descontar y cuenta como pérdida.

## Deudas (3.8)
- Interés = total a pagar − valor recibido; saldo; fecha estimada de la última cuota.
- Solo la cuota pagada en el período afecta el presupuesto, y solo si la deuda lo indica.
- Ajustar el valor al confirmar una cuota.
- Abono extraordinario reduce el saldo; el plan de cuotas se edita después.
- Compra con tarjeta a 1 cuota se registra como deuda.

## Normalización (3.9)
- "Exito", "éxito", "EXITO", "  Éxito  " → mismo normalizado.
- Espacios internos múltiples colapsados.
- "Panadería" y "Panaderia" iguales; "Ñapa" y "Napa" iguales al comparar (el nombre visible conserva la ñ).
- Sugerencia de parecidos: "Carula" sugiere "Carulla".

## QR DIAN (3.10)
- Facturas de ejemplo en `e2e/fixtures/qr/`: extrae fecha y valor total.
- QR ilegible o sin QR: devuelve un error claro y no rompe el formulario.
- Valor con decimales en el QR se redondea a pesos enteros (definir regla).
- La función recibe la imagen o el texto del QR y no guarda nada.

## Dinero
- `formatearPesos(35000)` → "$ 35.000" (con el espacio que produce `Intl` en es-CO; la prueba fija el formato exacto).
- Parseo de "35.000", "$35.000", "35000" → 35000; "abc", "-5", "3,5" → error.
