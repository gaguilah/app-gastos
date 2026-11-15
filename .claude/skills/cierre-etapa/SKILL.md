---
name: cierre-etapa
description: Verifica la definición de cierre de una etapa de App-Gastos y prepara el resumen escrito, el registro de atajos pendientes y la actualización del plan. Úsala cuando una etapa esté lista para la revisión final del usuario o cuando pida "cerrar la etapa N".
---

# Cierre de una etapa

Una etapa se da por terminada **solo** cuando cumple todo lo de abajo (sección 5 del plan). Claude prepara y verifica; **el usuario aprueba, fusiona y etiqueta** (o le pide a Claude que lo haga, de forma explícita).

## Verificación

- [ ] Todos los criterios de aceptación de la especificación están cumplidos; marca cada uno en el issue con el enlace a la prueba o al paso que lo demuestra.
- [ ] El harness completo pasa en GitHub Actions, sin errores pendientes.
- [ ] La skill `revision-codigo` dio "Listo para revisión del usuario", sin bloqueantes ni importantes abiertos.
- [ ] Hay versión de prueba en Netlify para el PR y el enlace está en el PR.
- [ ] El usuario revisó la versión de prueba en móvil (navegador e instalada), tablet y computador, y la aprobó en el PR o en la conversación. Usa la lista manual de `pruebas/references/pwa.md`.

## Atajos pendientes

Corre `/ponytail-debt` y copia el resultado en la sección "Pendiente" del resumen. Cada atajo queda como tarea en la etapa siguiente o como issue en "Por hacer".

## Resumen escrito

Publícalo como comentario en el issue de la etapa y en la descripción del PR:

```markdown
## Cierre · Etapa N · <nombre>

**Qué se hizo**
- …

**Qué quedó pendiente**
- … (incluye los atajos de /ponytail-debt)

**Qué se decidió**
- <decisión> · <fecha> · <motivo>

**Enlaces**
- PR: … · Versión de prueba: … · Issue: …
```

## Después de la aprobación del usuario

Solo con su aprobación explícita:
1. Fusionar el PR a `main`.
2. Crear la etiqueta de versión `etapa-N` sobre el commit fusionado.
3. Actualizar `docs/plan.md` con las decisiones tomadas (y marcar los pendientes resueltos de la sección 8).
4. Mover el issue a "Cerrado" en el tablero.
5. Preparar la especificación de la siguiente etapa con la skill `especificar-etapa`.
