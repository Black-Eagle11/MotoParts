<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Health Check

Route::get('/health', function () {
    return response()->json([
        'app' => 'MotoParts API',
        'status' => 'ok',
    ]);
});

// Public Authentication

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Public Catalog

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{category}', [CategoryController::class, 'show']);

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);

// Authenticated Routes - Laravel Sanctum

Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Product management
    Route::apiResource('products', ProductController::class)
        ->except(['index', 'show']);

    // Category management
    Route::apiResource('categories', CategoryController::class)
        ->except(['index', 'show']);

    // Customer orders
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);

    // Admin changes order status
    Route::patch('/admin/orders/{order}/status', [
        OrderController::class,
        'updateStatus',
    ]);
});
