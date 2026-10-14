<?php

use App\Http\Controllers\Admin\PanelController;
use App\Http\Controllers\Admin\PanelSessionController;
use App\Http\Controllers\Public\DedicationController;
use App\Http\Controllers\Public\EventController;
use App\Http\Controllers\Public\InvitationController;
use App\Http\Controllers\Public\RsvpController;
use App\Http\Controllers\Public\WeatherController;
use Illuminate\Support\Facades\Route;

// Público: la invitación se arma desde el layout del evento (eventos/<slug>/).
Route::prefix('public')->group(function () {
    Route::get('/events/{slug}', [EventController::class, 'show']);
    // El clima se guarda en caché: la mayoría de las visitas no llega a Open-Meteo.
    Route::get('/events/{slug}/weather', [WeatherController::class, 'show'])->middleware('throttle:60,1');

    // Invitación personal: el token de la URL es la credencial.
    Route::get('/invitations/{token}', [InvitationController::class, 'show']);
    Route::post('/invitations/{token}/rsvp', [RsvpController::class, 'store'])->middleware('throttle:rsvp');
    // Una dedicatoria por enlace.
    Route::post('/invitations/{token}/dedication', [DedicationController::class, 'store'])->middleware('throttle:dedication');
});

// Panel del dueño del evento: se entra con la clave del layout (clave_panel).
Route::prefix('admin/events/{slug}')->where(['slug' => '[a-z0-9-]+'])->group(function () {
    Route::get('/brand', [PanelSessionController::class, 'brand'])->middleware('throttle:60,1');
    Route::post('/session', [PanelSessionController::class, 'store'])->middleware('throttle:panel-login');

    // 120/min: el panel consulta la versión cada 5 s (12/min por pestaña) y aún sobra margen.
    Route::middleware(['panel', 'throttle:120,1'])->group(function () {
        Route::get('/', [PanelController::class, 'show']);
        Route::get('/version', [PanelController::class, 'version']);
        Route::put('/tables', [PanelController::class, 'updateTables']);
        Route::post('/invitations', [PanelController::class, 'storeInvitation']);
        Route::put('/deadline', [PanelController::class, 'updateDeadline']);
    });
});
