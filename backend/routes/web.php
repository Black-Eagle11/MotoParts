<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'app' => 'MotoParts',
        'message' => 'MotoParts backend is running.',
        'api' => url('/api'),
        'health' => url('/api/health'),
    ]);
});
