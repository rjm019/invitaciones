<?php

use App\Http\Controllers\Admin\PanelController;
use App\Http\Controllers\Admin\PanelSessionController;
use App\Http\Controllers\Internal\ReminderRunController;
use App\Http\Controllers\Manager\CatalogController;
use App\Http\Controllers\Manager\DesignController;
use App\Http\Controllers\Manager\EventController as ManagerEventController;
use App\Http\Controllers\Manager\MediaController as ManagerMediaController;
use App\Http\Controllers\Manager\QuoteController as ManagerQuoteController;
use App\Http\Controllers\Manager\SessionController as ManagerSessionController;
use App\Http\Controllers\Manager\TransferController;
use App\Http\Controllers\Manager\UserController;
use App\Http\Controllers\Manager\VisitController as ManagerVisitController;
use App\Http\Controllers\Public\AlbumController;
use App\Http\Controllers\Public\DedicationController;
use App\Http\Controllers\Public\DedicationWallController;
use App\Http\Controllers\Public\EventController;
use App\Http\Controllers\Public\InvitationController;
use App\Http\Controllers\Public\QuoteController;
use App\Http\Controllers\Public\RsvpController;
use App\Http\Controllers\Public\TriviaController;
use App\Http\Controllers\Public\VisitController;
use App\Http\Controllers\Public\WeatherController;
use App\Http\Controllers\Webhooks\WhatsAppController;
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
    // Muro de dedicatorias (solo lectura; solo con `muro` encendido en la sección).
    Route::get('/events/{slug}/dedications', [DedicationWallController::class, 'byEvent'])->middleware('throttle:dedication-wall');
    Route::get('/invitations/{token}/dedications', [DedicationWallController::class, 'byInvitation'])->middleware('throttle:dedication-wall');
    // Trivia: abrirla marca el inicio; responder la califica (una vez por enlace).
    Route::post('/invitations/{token}/trivia/start', [TriviaController::class, 'start'])->middleware('throttle:trivia');
    Route::post('/invitations/{token}/trivia', [TriviaController::class, 'store'])->middleware('throttle:trivia');

    // Álbum de los invitados: una foto por petición, hasta 2 por enlace, desde el día del evento.
    Route::post('/invitations/{token}/album', [AlbumController::class, 'store'])->middleware('throttle:album');

    // Cotizaciones de la landing.
    Route::post('/quotes', [QuoteController::class, 'store'])->middleware('throttle:quote');

    // Cada página vista (la landing, las invitaciones y las muestras): para las estadísticas.
    Route::post('/visits', [VisitController::class, 'store'])->middleware('throttle:visit');
});

// Panel del dueño del evento: se entra con la clave del layout (clave_panel).
Route::prefix('admin/events/{slug}')->where(['slug' => '[a-z0-9-]+'])->group(function () {
    Route::get('/brand', [PanelSessionController::class, 'brand'])->middleware('throttle:60,1');
    Route::post('/session', [PanelSessionController::class, 'store'])->middleware('throttle:panel-login');

    // 120/min: el panel consulta la versión cada 5 s (12/min por pestaña) y aún sobra margen.
    Route::middleware(['panel', 'throttle:120,1'])->group(function () {
        Route::get('/', [PanelController::class, 'show']);
        Route::get('/version', [PanelController::class, 'version']);
        Route::get('/trivia.csv', [PanelController::class, 'triviaCsv']);
        // Álbum: ver (con la sesión), elegir/quitar/rechazar y descargar las elegidas en .zip.
        Route::get('/album/{id}/{kind}', [PanelController::class, 'albumPhoto'])->where(['id' => '[a-f0-9]{16}', 'kind' => 'photo|thumb']);
        Route::put('/album', [PanelController::class, 'albumDecide']);
        Route::get('/album.zip', [PanelController::class, 'albumZip']);
        Route::put('/tables', [PanelController::class, 'updateTables']);
        Route::post('/invitations', [PanelController::class, 'storeInvitation']);
        Route::delete('/invitations/{id}', [PanelController::class, 'destroyInvitation'])->where('id', '[0-9]+');
        Route::put('/deadline', [PanelController::class, 'updateDeadline']);
        // Recordatorios por WhatsApp (solo con la función encendida por el gestor).
        Route::put('/invitations/{id}/phone', [PanelController::class, 'updatePhone'])->where('id', '[0-9]+');
        Route::put('/reminders', [PanelController::class, 'updateReminders']);
    });
});

// Recordatorios por WhatsApp: el cron (con clave) y el webhook de Meta (con firma). Sin
// throttle: lo llaman máquinas, y cada uno se protege con su propio secreto.
Route::post('/internal/reminders/run', [ReminderRunController::class, 'run']);
Route::get('/webhooks/whatsapp', [WhatsAppController::class, 'verify']);
Route::post('/webhooks/whatsapp', [WhatsAppController::class, 'receive']);

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

            Route::get('/quotes', [ManagerQuoteController::class, 'index']);
            Route::get('/quotes/count', [ManagerQuoteController::class, 'count']);
            Route::get('/quotes/export', [ManagerQuoteController::class, 'export']);
            Route::put('/quotes/{id}', [ManagerQuoteController::class, 'update'])->where('id', '[0-9]+');
            Route::delete('/quotes/{id}', [ManagerQuoteController::class, 'destroy'])->where('id', '[0-9]+');

            Route::get('/visits', [ManagerVisitController::class, 'index']);
            Route::get('/visits/count', [ManagerVisitController::class, 'count']);
            Route::get('/visits/export', [ManagerVisitController::class, 'export']);
        });

        Route::get('/catalog', CatalogController::class);
        Route::get('/events', [ManagerEventController::class, 'index']);
        Route::post('/events', [ManagerEventController::class, 'store']);

        // Quien edita solo entra a las invitaciones que creó o le asignaron (manager.event).
        Route::prefix('events/{slug}')->where(['slug' => '[a-z0-9-]+'])->middleware('manager.event')->group(function () {
            // Eliminar (solo quien administra): la carpeta pasa a la papelera del gestor.
            Route::delete('/', [ManagerEventController::class, 'destroy'])->middleware('manager.admin');
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
