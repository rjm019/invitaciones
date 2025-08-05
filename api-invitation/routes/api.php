<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\GuestController;

Route::get('/invitations', [InvitationController::class, 'index']);
Route::post('/invitations', [InvitationController::class, 'store']);
Route::get('/invitations/{id}', [InvitationController::class, 'show'])->name('invitation.show');
Route::post('/invitations/{id}/guests', [GuestController::class, 'store']);
Route::get('/invitations/{id}/guests', [GuestController::class, 'index']);
Route::get('/guests', [GuestController::class, 'listAll']);

