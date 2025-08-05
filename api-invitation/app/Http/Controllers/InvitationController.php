<?php

namespace App\Http\Controllers;

use App\Models\Invitation;
use Illuminate\Http\Request;

class InvitationController extends Controller
{
    public function index()
{
    $invitations = Invitation::all(); // Obtiene todas las invitaciones
    return response()->json($invitations, 200); // Devuelve como JSON
}

    public function store(Request $request)
{
    $request->validate([
        'family_name' => 'required|string|max:255',
        'max_guests' => 'required|integer|min:1',
    ]);

    // Generar el enlace con los parámetros correctos
    $link = sprintf(
        'http://localhost:5173/invitacion/%s/%d',
        urlencode($request->family_name),
        $request->max_guests
    );

    // Crear la invitación en la base de datos
    $invitation = Invitation::create([
        'family_name' => $request->family_name,
        'max_guests' => $request->max_guests,
        'link' => $link, // Enlace generado
    ]);

    return response()->json($invitation, 201);
}


    public function show($id)
    {
        $invitation = Invitation::with('guests')->findOrFail($id);
        return response()->json($invitation);
    }
}
