<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Guest extends Model
{
    use HasFactory;

    protected $fillable = ['invitation_id', 'first_name', 'last_name'];

    public function invitation()
    {
        return $this->belongsTo(Invitation::class);
    }
}
