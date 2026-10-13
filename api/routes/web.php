<?php

use App\Http\Controllers\Public\MediaController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Fotos, fondos y audio de cada evento (eventos/<slug>/media/).
Route::get('/media/{slug}/{file}', MediaController::class)
    ->where(['slug' => '[a-z0-9-]+', 'file' => '[A-Za-z0-9._-]+']);

// La invitación (SPA): cualquier otra ruta (/e/…, /i/…, /panel/…) devuelve la página y el
// router de Vue decide qué mostrar. Lo que empieza con /api sigue siendo un 404 en JSON.
Route::fallback(function (Request $request) {
    $spa = (string) config('invitaciones.spa_path');
    abort_if($request->is('api', 'api/*') || ! is_file($spa), 404);

    return response()->file($spa, ['Cache-Control' => 'no-cache']);
});
