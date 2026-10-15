<?php

use App\Http\Controllers\Admin\PanelController;
use App\Http\Controllers\Admin\PanelSessionController;
use App\Http\Controllers\Manager\CatalogController;
use App\Http\Controllers\Manager\DesignController;
use App\Http\Controllers\Manager\EventController as ManagerEventController;
use App\Http\Controllers\Manager\MediaController as ManagerMediaController;
use App\Http\Controllers\Manager\SessionController as ManagerSessionController;
use App\Http\Controllers\Manager\TransferController;
use App\Http\Controllers\Manager\UserController;
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
        Route::delete('/invitations/{id}', [PanelController::class, 'destroyInvitation'])->where('id', '[0-9]+');
        Route::put('/deadline', [PanelController::class, 'updateDeadline']);
    });
});

// Gestor de invitaciones (/gestor): crea y diseña invitaciones. Cada persona entra con su
// usuario; GESTOR_CLAVE lo enciende y crea la primera cuenta.
Route::prefix('manager')->group(function () {
    Route::get('/session', [ManagerSessionController::class, 'status'])->middleware('throttle:60,1');
    Route::post('/session', [ManagerSessionController::class, 'store'])->middleware('throttle:manager-login');
    Route::post('/setup', [ManagerSessionController::class, 'setup'])->middleware('throttle:manager-login');

    // 240/min: el editor guarda solo (con pausa de 400 ms) mientras se escribe.
    Route::middleware(['manager', 'throttle:240,1'])->group(function () {
        Route::get('/me', [ManagerSessionController::class, 'me']);
        Route::put('/me/password', [ManagerSessionController::class, 'password'])->middleware('throttle:manager-password');

        Route::middleware('manager.admin')->group(function () {
            Route::get('/users', [UserController::class, 'index']);
            Route::post('/users', [UserController::class, 'store']);
            Route::put('/users/{username}', [UserController::class, 'update'])->where('username', '[a-z0-9._@-]+');
        });

        Route::get('/catalog', CatalogController::class);
        Route::get('/events', [ManagerEventController::class, 'index']);
        Route::post('/events', [ManagerEventController::class, 'store']);

        // Quien edita solo entra a las invitaciones que creó o le asignaron (manager.event).
        Route::prefix('events/{slug}')->where(['slug' => '[a-z0-9-]+'])->middleware('manager.event')->group(function () {
            Route::put('/settings', [ManagerEventController::class, 'settings']);
            Route::get('/design', [DesignController::class, 'show']);
            Route::put('/draft', [DesignController::class, 'save']);
            Route::delete('/draft', [DesignController::class, 'discard']);
            Route::post('/publish', [DesignController::class, 'publish']);
            Route::get('/history', [DesignController::class, 'history']);
            Route::post('/history/{id}/restore', [DesignController::class, 'restore'])->where('id', '[0-9-]+');
            Route::get('/media', [ManagerMediaController::class, 'index']);
            Route::post('/media', [ManagerMediaController::class, 'store']);
            Route::delete('/media/{file}', [ManagerMediaController::class, 'destroy'])->where('file', '[A-Za-z0-9._-]+');
            Route::get('/export', [TransferController::class, 'export']);
            Route::post('/import', [TransferController::class, 'import']);
        });
    });
});
