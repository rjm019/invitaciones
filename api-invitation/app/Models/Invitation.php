<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invitation extends Model
{
    use HasFactory;

    protected $fillable = ['family_name', 'max_guests', 'link'];

    public function guests()
    {
        return $this->hasMany(Guest::class);
    }
}
