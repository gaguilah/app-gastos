---
name: especificar-etapa
description: Redacta la especificación (SDD) de una etapa o funcionalidad de App-Gastos como issue de GitHub con objetivo, reglas, criterios de aceptación y tareas. Úsala al iniciar cualquier etapa del plan, cuando el usuario pida "especificar", "arrancar la etapa N" o una funcionalidad nueva, y siempre antes de escribir código.
---

# Especificar una etapa (SDD)

En este proyecto **no se programa sin una especificación aprobada por el usuario**. Esta skill produce esa especificación y la deja lista para aprobar.

## Fuentes, en orden de autoridad

1. Lo que el usuario diga en la conversación actual.
2. `docs/plan.md` (copia del "Plan – App de Gastos Personales"): reglas de negocio (sección 3), modelo de datos (4), harness (6) y la tabla de etapas (7).
3. Especificaciones ya aprobadas de etapas anteriores (issues cerrados con la etiqueta `spec`).
4. `DESIGN.md` y la skill `diseno-ui`, para cualquier etapa con pantallas.

Si el plan y el usuario se contradicen, gana el usuario, y el cambio se anota en la sección "Decisiones" de la especificación para luego actualizar el plan.

## Pasos

1. **Ubica la etapa** en la tabla de la sección 7 del plan: objetivo, entregables y criterio principal de cierre.
2. **Extrae las reglas** de la sección 3 que aplican. Cítalas por número (por ejemplo, "3.4 Bolsas") en lugar de reescribirlas, para que haya una sola fuente.
3. **Detecta huecos**: casos borde sin regla, choques entre reglas, datos del modelo que faltan. Pregúntale al usuario solo lo que no se pueda deducir del plan; lo demás, propónlo como supuesto explícito.
4. **Redacta el issue** con la plantilla de `references/plantilla-issue.md`.
5. **Criterios de aceptación verificables**: cada uno se puede comprobar con una prueba automática o con un paso concreto en la versión de prueba de Netlify. Nada de "funciona bien" o "se ve bien".
6. **Marca qué va con TDD**: toda regla de cálculo (períodos, periódicos, alertas, bolsas, préstamos, deudas, normalización de nombres, QR) lleva sus casos de prueba listados en la especificación. La skill `pruebas` tiene la lista de casos borde mínimos.
7. **Divide en tareas** pequeñas (una tarea ≈ un commit revisable), en el orden: migraciones → pruebas de reglas → lógica → UI → E2E.
8. **Publica el issue** con las etiquetas `spec` y `etapa-N`, muévelo a la columna "Especificando" del tablero y **espera la aprobación del usuario**. No crees la rama ni escribas código hasta que la apruebe.

## Reglas

- Una especificación corta y completa vale más que una larga: el objetivo cabe en dos frases.
- Las pantallas se describen en los tres tamaños (móvil, tablet, computador) y en los dos modos (navegador e instalada).
- Todo texto visible se anota con su clave de traducción propuesta (`gastos.formulario.titulo`), en español e inglés.
- Lo que la etapa **no** incluye se escribe en "Fuera de alcance", para que nadie lo construya por adelantado.
- Si una tarea necesita una dependencia nueva, la especificación la justifica (qué resuelve que el proyecto o la plataforma no resuelvan ya).
