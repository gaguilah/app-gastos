# Plantilla del issue de especificación

Título: `Etapa N · <objetivo en pocas palabras>`
Etiquetas: `spec`, `etapa-N`

```markdown
## Objetivo
<Una o dos frases: qué podrá hacer el usuario al terminar la etapa.>

## Reglas que aplican
- 3.x <nombre de la regla> (ver docs/plan.md)
- …

## Supuestos y decisiones
- <Supuesto propuesto o decisión tomada con el usuario, con fecha.>

## Entregables
- [ ] …

## Criterios de aceptación
- [ ] Dado <contexto>, cuando <acción>, entonces <resultado observable>.
- [ ] …
- [ ] Cumple en móvil, tablet y computador, en navegador e instalada (si hay pantallas).
- [ ] Textos en español e inglés.

## Casos de prueba de reglas (TDD)
| Regla | Caso | Entrada | Resultado esperado |
| --- | --- | --- | --- |
| 3.1 Período | Inicio día 15 | hoy = 2026-03-02, inicio = 15 | 2026-02-15 → 2026-03-14 |

## Pantallas (si aplica)
| Pantalla | Móvil | Tablet | Computador | Estados (vacío, carga, error) |
| --- | --- | --- | --- | --- |

## Cambios en la base de datos (si aplica)
- Tablas, columnas, restricciones únicas, políticas RLS.

## Tareas
1. [ ] Migración …
2. [ ] Pruebas de …
3. [ ] …

## Fuera de alcance
- …
```
