<?php

namespace App\Http\Controllers;

use App\Models\Guest;
use App\Models\Invitation;
use Illuminate\Http\Request;

class GuestController extends Controller
{
    public function index($invitationId)
{
    // Obtiene los invitados asociados a una invitación específica
    $guests = Guest::where('invitation_id', $invitationId)->get();

    return response()->json($guests, 200); // Devuelve los invitados como JSON
}

    public function store(Request $request, $invitationId)
    {
        $invitation = Invitation::findOrFail($invitationId);

        $request->validate([
            'guests' => 'required|array|max:' . $invitation->max_guests,
            'guests.*.first_name' => 'required|string|max:255',
            'guests.*.last_name' => 'required|string|max:255',
        ]);

        foreach ($request->guests as $guest) {
            $invitation->guests()->create($guest);
        }

        return response()->json(['message' => 'Guests registered successfully.'], 201);
    }

    public function index($invitationId)
    {
        $guests = Guest::where('invitation_id', $invitationId)->get();
        return response()->json($guests);
    }
}
