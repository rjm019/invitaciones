<?php

use App\Http\Controllers\Public\MediaController;
use App\Http\Controllers\SpaController;
use Illuminate\Support\Facades\Route;

// Fotos, fondos y audio de cada evento (eventos/<slug>/media/).
Route::get('/media/{slug}/{file}', MediaController::class)
    ->where(['slug' => '[a-z0-9-]+', 'file' => '[A-Za-z0-9._-]+']);

// La invitación (SPA): cualquier otra ruta (/e/…, /i/…, /panel/…) devuelve la página, ya con
// los datos del evento cuando aplica. Lo que empieza con /api sigue siendo un 404 en JSON.
Route::fallback(SpaController::class);
