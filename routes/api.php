<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TwoFactorController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AccountController;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/login/verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:10,1');

// Token limited to 2FA setup
Route::middleware(['auth:sanctum', 'ability:2fa-setup'])->group(function () {
    Route::post('/2fa/setup', [TwoFactorController::class, 'setup']);
    Route::post('/2fa/confirm', [TwoFactorController::class, 'confirm']);
});

// Full tokens only
Route::middleware(['auth:sanctum', 'ability:*'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::middleware('role:master_teacher')->group(function () {
    Route::post('/teachers', [AccountController::class, 'createTeacher']);
});

Route::middleware('role:master_teacher,teacher')->group(function () {
    Route::post('/students', [AccountController::class, 'createStudent']);
    Route::get('/accounts/{role}', [AccountController::class, 'index']);
    Route::patch('/accounts/{userId}/status', [AccountController::class, 'setStatus']);
});
});