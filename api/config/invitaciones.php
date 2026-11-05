<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Carpeta de eventos
    |--------------------------------------------------------------------------
    |
    | Cada evento es una carpeta eventos/<slug>/ con su invitación (invitacion.csv;
    | o, en el formato anterior, layout.xlsx o un CSV por pestaña), su media/ y los
    | CSV que escribe el sistema (enlaces, respuestas, ajustes). No hay base de datos.
    |
    */

    'eventos_path' => env('EVENTOS_PATH', base_path('../eventos')),

    /*
    |--------------------------------------------------------------------------
    | URL pública de la invitación (SPA)
    |--------------------------------------------------------------------------
    */

    'frontend_url' => rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/'),

    /*
    |--------------------------------------------------------------------------
    | La invitación compilada (producción)
    |--------------------------------------------------------------------------
    |
    | En la imagen de producción, la SPA de web/ se copia a public/ y su
    | index.html queda como app.html. Laravel lo responde en cualquier ruta que
    | no sea de la API ni de media. En desarrollo no existe (la sirve Vite).
    |
    */

    'spa_path' => env('SPA_PATH', public_path('app.html')),

    /*
    |--------------------------------------------------------------------------
    | Gestor de invitaciones
    |--------------------------------------------------------------------------
    |
    | Clave maestra del panel del gestor (/gestor), donde se crean y diseñan las
    | invitaciones. Mínimo 16 caracteres; sin ella el gestor no abre. En producción
    | es un secreto de Fly (fly secrets set GESTOR_CLAVE=…), nunca va en el repo.
    |
    */

    'gestor_clave' => (string) env('GESTOR_CLAVE', ''),

    /*
    |--------------------------------------------------------------------------
    | Cotizaciones de la landing
    |--------------------------------------------------------------------------
    |
    | Correo que recibe el aviso de cada cotización nueva. Vacío: solo se ven en el
    | gestor. El envío usa el mailer de siempre (MAIL_*); con Resend, por SMTP:
    | MAIL_MAILER=smtp, MAIL_HOST=smtp.resend.com, MAIL_PORT=465, MAIL_SCHEME=smtps,
    | MAIL_USERNAME=resend y MAIL_PASSWORD=<la API key>. Todo como secretos de Fly.
    |
    */

    'cotizaciones_correo' => (string) env('COTIZACIONES_CORREO', ''),

    /*
    |--------------------------------------------------------------------------
    | Recordatorios del RSVP por WhatsApp (fase 12)
    |--------------------------------------------------------------------------
    |
    | driver: "log" (local y pruebas: solo escribe en el log) o "meta" (WhatsApp Cloud
    | API). token, phone_number_id, app_secret y verify_token vienen de Meta y van como
    | secretos de Fly. run_key es la clave con la que el cron llama a
    | POST /api/internal/reminders/run; vacía, ese endpoint no responde.
    | daily_limit: máximo de mensajes al día entre todos los eventos (el límite de Meta);
    | per_link_max: recordatorios por invitación; default_cap: tope de un evento si el
    | gestor no pone otro; hours: ventana de envío (hora local del evento).
    |
    */

    'whatsapp' => [
        'driver' => (string) env('WHATSAPP_DRIVER', 'log'),
        'token' => (string) env('WHATSAPP_TOKEN', ''),
        'phone_number_id' => (string) env('WHATSAPP_PHONE_NUMBER_ID', ''),
        'app_secret' => (string) env('WHATSAPP_APP_SECRET', ''),
        'verify_token' => (string) env('WHATSAPP_VERIFY_TOKEN', ''),
        'template' => (string) env('WHATSAPP_TEMPLATE', 'recordatorio_rsvp'),
        'template_lang' => (string) env('WHATSAPP_TEMPLATE_LANG', 'es_MX'),
        'graph_version' => (string) env('WHATSAPP_GRAPH_VERSION', 'v23.0'),
        'daily_limit' => (int) env('WHATSAPP_LIMITE_DIARIO', 200),
        'per_link_max' => 5,
        'default_cap' => 300,
        'run_key' => (string) env('RECORDATORIOS_CLAVE', ''),
        'hours' => '10-20',
    ],

    // Buscador de invitados (recepcion/): contraseña de quien puede cargar la lista.
    'recepcion_clave' => (string) env('RECEPCION_CLAVE', ''),

];
