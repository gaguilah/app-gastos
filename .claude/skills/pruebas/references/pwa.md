# Pruebas de la PWA (modo instalada)

Algunas se automatizan con Playwright (Chromium); otras requieren revisión manual en dispositivos reales y van en la lista de criterios de la versión de prueba de Netlify.

| Prueba (sección 6 del plan) | Automática | Cómo |
| --- | --- | --- |
| La app se puede instalar | Parcial | Manifiesto válido (nombre, íconos 192 y 512, `display: standalone`, `start_url`) y service worker registrado. Manual: instalar en Android, iPhone y computador |
| Nada queda tapado por la muesca o la barra | Manual | iPhone con la app instalada; el CSS usa `env(safe-area-inset-*)` |
| Al publicar una versión nueva, la app se actualiza | Sí | Servir dos builds; verificar que aparece el aviso de versión nueva y que al aceptar carga la nueva |
| Las notificaciones push llegan | Parcial | Automática: la suscripción se guarda y la función de envío arma el mensaje traducido. Manual: recibirla en Android, computador e iPhone instalado |
| Sin conexión se muestra un aviso claro | Sí | `context.setOffline(true)` y verificar el aviso; al volver, el aviso desaparece |
| Dos dispositivos se sincronizan | Sí | Dos `browserContext` con el mismo usuario; registrar un gasto en uno y verlo en el otro sin recargar |

## Lista manual para la revisión del usuario (cada etapa con pantallas)

- [ ] Móvil en el navegador y con la app instalada.
- [ ] Tablet en el navegador y con la app instalada.
- [ ] Computador en el navegador y con la app instalada.
- [ ] En iPhone instalado: la barra superior y la inferior no tapan contenido.
- [ ] Modo avión: aparece el aviso y no se pierden datos sin avisar.
