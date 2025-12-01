<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ReportController;

// Các route API cho Snapshot Báo cáo
Route::prefix('reports')->group(function () {
    Route::post('/snapshot/create', [ReportController::class, 'createSnapshot'])
        ->name('reports.snapshot.create');

    Route::get('/snapshots', [ReportController::class, 'getSnapshots'])
        ->name('reports.snapshots');

    Route::get('/snapshot/{id}', [ReportController::class, 'showSnapshot'])
        ->name('reports.snapshot.show');
});