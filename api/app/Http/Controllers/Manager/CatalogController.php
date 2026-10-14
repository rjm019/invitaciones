<?php

namespace App\Http\Controllers\Manager;

use App\Http\Controllers\Controller;
use App\Services\Design\Catalog;
use Illuminate\Http\JsonResponse;

/** GET /api/manager/catalog — todo lo que se puede poner en una invitación (el editor arma sus formularios con esto). */
class CatalogController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json(['catalog' => Catalog::toArray()]);
    }
}
