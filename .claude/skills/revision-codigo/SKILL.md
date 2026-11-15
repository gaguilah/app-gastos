---
name: revision-codigo
description: Revisión de código y seguridad de App-Gastos antes de entregar o fusionar un cambio: corre /ponytail-review y luego el checklist propio (reglas de negocio del plan, RLS y seguridad de datos, dinero y fechas, i18n, accesibilidad, pruebas). Úsala antes de abrir o actualizar un PR, cuando el usuario pida "revisar", y al final de cada tarea de una etapa.
---

# Revisión de código

Dos pasadas, en este orden. La segunda es la que decide, porque conoce las reglas del negocio.

## 0. Preparación

1. Identifica el alcance: el diff de la rama contra `main` (`git diff main...HEAD`) y la especificación aprobada de la etapa (issue con etiqueta `spec`).
2. Confirma que el harness está en verde (skill `pruebas`, "Qué correr antes de entregar"). Si algo falla, la revisión se detiene ahí: primero se arregla.

## 1. Pasada de Ponytail

Corre `/ponytail-review branch` en modo `full` (nunca `ultra`). Busca bugs, código de más, abstracciones innecesarias, rutas lentas y lógica con riesgo sin prueba, incluso en archivos que el diff no tocó pero que dependen de él.

Filtra sus hallazgos con el plan: si propone quitar algo que la especificación pide (un campo, un estado, una validación, una prueba), descarta ese hallazgo y anótalo como "descartado: lo pide el plan, sección X".

## 2. Checklist propio

Lee el código que cambió y el que lo rodea. Para cada punto que no se cumpla, crea un hallazgo.

### Reglas de negocio
- [ ] Cada criterio de aceptación de la especificación tiene código y prueba que lo cubren.
- [ ] El disponible del período, los saldos de bolsas, deudas y préstamos se **derivan** de movimientos; ninguna columna de saldo se escribe a mano.
- [ ] Gastos pendientes de confirmar no afectan el presupuesto hasta confirmarse.
- [ ] Solo las categorías del tipo correcto aparecen en cada formulario.
- [ ] Editar plantillas (periódicos, deudas, categorías) no altera el historial.
- [ ] Las categorías del sistema no se pueden eliminar.
- [ ] La generación de periódicos, cuotas y alertas es idempotente.

### Seguridad y datos
- [ ] Toda tabla nueva tiene RLS activado, políticas para las cuatro operaciones y pruebas pgTAP.
- [ ] Las relaciones no permiten apuntar a datos de otro usuario.
- [ ] Ningún uso de la clave `service_role` en el frontend; ningún secreto en el código o en el repositorio.
- [ ] Ningún dato de tarjeta (número, vencimiento, CVV) en tablas, formularios, logs ni pruebas.
- [ ] La foto del QR no se guarda ni se envía.
- [ ] Funciones `security definer` con `search_path = ''` y filtro por `auth.uid()`; vistas con `security_invoker`.
- [ ] Entradas externas validadas en el borde (formularios, QR, parámetros de Edge Functions).
- [ ] Toda ruta nueva queda dentro del layout protegido; `/login` sigue siendo la única pública y aparece en la prueba de rutas protegidas.
- [ ] No hay registro: ninguna ruta, enlace ni llamada a `signUp`.
- [ ] El parámetro `siguiente` del login solo acepta rutas internas.
- [ ] Ningún cambio contra el proyecto Supabase real.
- [ ] Para cambios grandes o de autenticación, corre también `/security-review`.

### Dinero y fechas
- [ ] Montos en enteros (`bigint` / entero en TS); sin `float` ni decimales.
- [ ] Formato de montos solo con el helper compartido.
- [ ] "Hoy" en `America/Bogota`, desde el reloj inyectable; ninguna llamada a `Date.now()` en `dominio/`.
- [ ] Fechas de calendario como `YYYY-MM-DD`, sin `new Date("YYYY-MM-DD")`.

### UI, accesibilidad e idiomas (si hay pantallas)
- [ ] Sin colores, tamaños ni textos fijos en componentes: tokens y archivos de traducción.
- [ ] Componentes en su nivel: shadcn en `components/ui`, compartidos en `components/shared`, los de un módulo en su `features/`; ningún módulo importa componentes de otro.
- [ ] `es.json` y `en.json` con las mismas claves.
- [ ] Revisado en móvil, tablet y computador.
- [ ] Lista de `diseno-ui/references/accesibilidad.md` cumplida.
- [ ] `/impeccable audit` sin hallazgos P0 ni P1 abiertos.

### Calidad
- [ ] Sin `any`, sin `console.log`, sin código comentado, sin pruebas desactivadas (`skip`, `only`).
- [ ] Dependencias nuevas justificadas en la especificación.
- [ ] Atajos deliberados marcados con `shortcut:`.
- [ ] Migraciones nuevas (no editadas) y `supabase db reset` en verde.

## 3. Informe

Entrega el informe con este formato y en español:

```markdown
## Revisión · <rama> · <fecha>

**Veredicto:** Listo para revisión del usuario | Requiere cambios

### Bloqueantes
1. `ruta/archivo.ts:42` · <qué pasa> · <por qué importa> · <cómo arreglarlo>

### Importantes
…

### Menores
…

### Descartados de Ponytail
- <hallazgo> · descartado porque lo pide el plan (3.x)

### Verificado
- Harness: estática ✓ · unitarias ✓ · base de datos ✓ · componentes ✓ · E2E ✓ · a11y/i18n ✓
```

- **Bloqueante**: rompe una regla del plan, la seguridad, el historial o una prueba. No se entrega hasta corregirlo.
- **Importante**: bug probable, prueba faltante en lógica con riesgo, accesibilidad P1.
- **Menor**: estilo, nombres, simplificaciones.

Si hay bloqueantes, corrígelos y repite la revisión. Para una revisión independiente, delega en el agente `revisor` (`.claude/agents/revisor.md`), que aplica esta misma skill en modo de solo lectura.
