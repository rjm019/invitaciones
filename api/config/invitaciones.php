<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Carpeta de eventos
    |--------------------------------------------------------------------------
    |
    | Cada evento es una carpeta eventos/<slug>/ con su layout (layout.xlsx o
    | un CSV por pestaña), su media/ y los CSV que escribe el sistema
    | (tokens, links, respuestas). No hay base de datos.
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

];
