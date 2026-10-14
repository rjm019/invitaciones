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

];
