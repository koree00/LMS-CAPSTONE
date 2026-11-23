<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\LessonController;
use App\Http\Controllers\Api\ProgressController;
use App\Http\Controllers\Api\RewardController;
use App\Http\Controllers\Api\SectionController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\TwoFactorController;
use Illuminate\Support\Facades\Route;

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

    // Shared authenticated roles
    Route::middleware('role:master_teacher,teacher,student')->group(function () {
        Route::get('/lessons', [LessonController::class, 'index']);
        Route::get('/lessons/{id}', [LessonController::class, 'show']);
        Route::get('/rewards', [RewardController::class, 'index']);
    });

    Route::middleware(['role:master_teacher,teacher,student', 'throttle:5,1'])->group(function () {
        Route::post('/account/password', [SettingsController::class, 'changePassword']);
    });

    // Student routes
    Route::middleware('role:student')->group(function () {
        Route::get('/my/levels', [ProgressController::class, 'levels']);
        Route::get('/my/progress', [ProgressController::class, 'mine']);
        Route::put('/my/progress/{lessonId}', [ProgressController::class, 'save']);

        Route::get('/my/game', [GameController::class, 'current']);
        Route::post('/my/game/attempts', [GameController::class, 'attempt']);
        Route::get('/my/coins', [GameController::class, 'coins']);

        Route::post('/rewards/{id}/claim', [RewardController::class, 'claim']);
        Route::get('/my/rewards', [RewardController::class, 'mine']);

        Route::get('/avatars', [SettingsController::class, 'avatars']);
        Route::get('/my/profile', [SettingsController::class, 'profile']);
        Route::patch('/my/profile', [SettingsController::class, 'updateProfile']);
    });

    // Master teacher & teacher routes
    Route::middleware('role:master_teacher,teacher')->group(function () {
        Route::get('/games', [GameController::class, 'index']);

        Route::get('/sections', [SectionController::class, 'index']);
        Route::get('/sections/{id}', [SectionController::class, 'show']);
        Route::post('/sections/{id}/students', [SectionController::class, 'addStudent']);
        Route::delete('/sections/{id}/students/{studentId}', [SectionController::class, 'removeStudent']);

        Route::post('/students', [AccountController::class, 'createStudent']);
        Route::get('/accounts/{role}', [AccountController::class, 'index']);
        Route::patch('/accounts/{userId}/status', [AccountController::class, 'setStatus']);

        Route::get('/students/{studentId}/rewards', [RewardController::class, 'forStudent']);
    });

    // Master teacher routes
    Route::middleware('role:master_teacher')->group(function () {
        Route::post('/teachers', [AccountController::class, 'createTeacher']);

        Route::post('/games', [GameController::class, 'store']);
        Route::post('/games/{id}/validate', [GameController::class, 'validateGame']);

        Route::post('/sections', [SectionController::class, 'store']);
        Route::patch('/sections/{id}', [SectionController::class, 'update']);

        Route::post('/lessons', [LessonController::class, 'store']);
        Route::patch('/lessons/{id}', [LessonController::class, 'update']);
        Route::delete('/lessons/{id}', [LessonController::class, 'destroy']);

        Route::post('/rewards', [RewardController::class, 'store']);
        Route::patch('/rewards/{id}', [RewardController::class, 'update']);

        Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
        Route::get('/analytics/summary', [AdminController::class, 'summary']);
        Route::get('/exports/student-progress', [AdminController::class, 'exportProgress']);
    });
});