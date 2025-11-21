<?php

use App\Http\Controllers\CallController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserLocationController;
use App\Http\Controllers\StatusController;
use Inertia\Inertia;
use App\Http\Controllers\Auth\SessionHelperController;

// Public routes
Route::get('/', [HomeController::class, 'home'])->name('home');

// Protected routes
Route::middleware(['auth', 'verified', 'active'])->group(function () {
    Route::get('/dashboard', [HomeController::class, 'home'])->name('dashboard');
    Route::get('user/{user}', [MessageController::class, 'byUser'])->name('chat.user');
    Route::get('group/{group}', [MessageController::class, 'byGroup'])->name('chat.group');
    Route::post('/message', [MessageController::class, 'store'])->name('message.store');
    Route::delete('/message/{message}', [MessageController::class, 'destroy'])->name('message.destroy');
    Route::get('/message/older/{message}', [MessageController::class, 'loadOlder'])->name('message.loadOlder');
    Route::post('/message/forward', [MessageController::class, 'forward'])->name('message.forward');
    Route::post('/message/report', [MessageController::class, 'report'])->name('message.report');
    
    Route::get('/conversations', [MessageController::class, 'getConversations'])->name('conversations.list');

    // Status / Stories
    Route::get('/status', [StatusController::class, 'index'])->name('status.index');
    Route::post('/status', [StatusController::class, 'store'])->name('status.store');

    // Live location routes (for any authenticated active user)
    Route::post('/location/update', [UserLocationController::class, 'update'])
        ->name('location.update');
    Route::get('/location/{user}', [UserLocationController::class, 'show'])
        ->name('location.show');

    // Video Call Routes
    Route::post('/calls/initiate', [CallController::class, 'initiate'])->name('call.initiate');
    Route::post('/calls/{call}/join', [CallController::class, 'join'])->name('call.join');
    Route::post('/calls/{call}/leave', [CallController::class, 'leave'])->name('call.leave');
    Route::post('/calls/{call}/end', [CallController::class, 'end'])->name('call.end');
    Route::post('/calls/{call}/reject', [CallController::class, 'reject'])->name('call.reject');
    Route::get('/calls/{call}/token', [CallController::class, 'getToken'])->name('call.token');
    Route::post('/calls/{call}/toggle-mic', [CallController::class, 'toggleMic'])->name('call.toggleMic');
    Route::post('/calls/{call}/toggle-video', [CallController::class, 'toggleVideo'])->name('call.toggleVideo');
    Route::get('/calls/history', [CallController::class, 'history'])->name('call.history');

    Route::delete('/group/{group}', [GroupController::class, 'destroy'])->name('group.destroy');

    Route::middleware(['admin'])->group(function () {
        Route::post('/group', [GroupController::class, 'store'])->name('group.store');
        Route::put('/group/{group}', [GroupController::class, 'update'])->name('group.update');
        
        Route::post('/user', [UserController::class, 'store'])->name('user.store');
        Route::put('/user/change-role/{user}', [UserController::class, 'changeRole'])->name('user.changeRole');
        Route::put('/user/block-unblock/{user}', [UserController::class, 'blockUnblock'])->name('user.blockUnblock');
        Route::delete('/user/{user}', [UserController::class, 'destroy'])->name('user.destroy');
    });
});


Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';

// Route to clear any existing session and redirect to login (used in emails)
Route::get('/auth/clear-and-login', [SessionHelperController::class, 'clearAndRedirect'])->name('auth.clear_and_login');
