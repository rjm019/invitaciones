# Checklist de QA (para cada invitación)

## Contenido

- [ ] Nombre, fecha, hora, día de la semana y año coinciden en: portada, save the date, calendario, countdown e itinerario.
- [ ] `rsvp_deadline` es anterior a `starts_at`, y el texto "ANTES DEL …" muestra esa fecha.
- [ ] Ortografía y acentos revisados ("capítulo", "sí solos", "Salón"…).
- [ ] Links de Maps abren el lugar correcto (probar en el celular).
- [ ] Nombres de familiares y padrinos aprobados por el cliente.

## Funcionalidad

- [ ] Token válido → invitación; inválido → página "no encontrada" amable.
- [ ] RSVP:
  - Confirmar con 1 pase y con todos los pases.
  - Intentar más pases (debe fallar).
  - Declinar.
  - Modificar.
  - Doble clic en enviar.
- [ ] Después del deadline: el botón queda deshabilitado con su mensaje.
- [ ] El PDF de pases se descarga y el QR se lee con la cámara.
- [ ] El panel admin refleja la respuesta en menos de 5 s (al recargar).
- [ ] Exportar CSV funciona y abre bien en Excel (UTF-8 con BOM).

## Dispositivos y navegadores

- [ ] iPhone (Safari) y Android (Chrome), en vertical.
- [ ] Abrir **desde WhatsApp** (navegador interno) en ambos.
- [ ] Escritorio: Chrome y Safari a 1440 px (la columna centrada se ve bien).
- [ ] Anchos de 360, 390, 414 y 768 px.

## Audio y efectos

- [ ] El audio no suena antes de tocar el sobre; después sí, también en iOS.
- [ ] El mini-reproductor pausa y reanuda.
- [ ] El sobre, la línea del itinerario, el countdown y el reveal funcionan con fluidez.
- [ ] Con "Reducir movimiento" activado en el sistema, no hay animaciones decorativas.

## Rendimiento y accesibilidad (Lighthouse móvil)

- [ ] Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95.
- [ ] LCP < 2.5 s y CLS < 0.1.
- [ ] Todas las imágenes tienen `alt` (las decorativas con `alt=""`).
- [ ] Contraste del texto de cuerpo ≥ 4.5:1.
- [ ] Botones con `aria-label`, foco visible y navegables con teclado.

## Privacidad y seguridad

- [ ] `robots: noindex` presente.
- [ ] El token no aparece en logs públicos ni en Analytics (usar la ruta sin token o con hash).
- [ ] No hay datos reales en el repo (`git grep` del apellido o nombre del cliente).
- [ ] HTTPS activo en el frontend y en la API.
- [ ] Throttle del RSVP probado (debe dar 429).

## Vista previa al compartir

- [ ] Al pegar el link en WhatsApp aparecen imagen, título y descripción del evento.
