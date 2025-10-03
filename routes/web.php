<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CycleController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ObjectiveController;
use App\Http\Controllers\KeyResultController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\MyOKRController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('landingpage');
});

// Landing Page - hiển thị nút đăng nhập
Route::get('/landingpage', function () {
    return view('landingpage');
})->name('landingpage');

Route::group(['middleware' => ['web', 'check.status', 'timezone']], function () {
    // Route xác thực
    Route::get('/login', [AuthController::class, 'redirectToCognito'])->name('login');
    Route::get('/auth/google', [AuthController::class, 'redirectToGoogle'])->name('auth.google');
    Route::get('/auth/signup', [AuthController::class, 'redirectToSignup'])->name('auth.signup');
    Route::get('/auth/callback', [AuthController::class, 'handleCallback'])->name('auth.callback');
    Route::get('/auth/forgot', [AuthController::class, 'forgotPassword'])->name('auth.forgot');
    Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');

    // Route đăng nhập admin mặc định (chỉ cho development)
    if (env('APP_ENV') === 'local') {
        Route::get('/admin-login', function () {
            return view('auth.admin-login');
        })->name('admin.login');

        Route::post('/admin-login', function (\Illuminate\Http\Request $request) {
            $credentials = $request->validate([
                'email' => 'required|email',
                'password' => 'required',
            ]);

            if (\Illuminate\Support\Facades\Auth::attempt($credentials)) {
                $user = \Illuminate\Support\Facades\Auth::user();

                // Kiểm tra trạng thái tài khoản
                if ($user->status === 'inactive') {
                    \Illuminate\Support\Facades\Auth::logout();
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();

                    return redirect()->route('admin.login')
                        ->withErrors('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.');
                }

                $request->session()->regenerate();
                return redirect()->intended('/dashboard');
            }

            return back()->withErrors([
                'email' => 'Thông tin đăng nhập không chính xác.',
            ]);
        });
    }

    // Route dashboard
    Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('auth')->name('dashboard');

    //Routes cho Cycle
    Route::resource('cycles', CycleController::class);

    //Routes cho Department
    Route::resource('departments', DepartmentController::class);

    // Routes cho Profile
    Route::get('/profile', [ProfileController::class, 'show'])->middleware('auth')->name('profile.show');
    Route::post('/profile', [ProfileController::class, 'update'])->middleware('auth')->name('profile.update');
    Route::get('/change-password', [App\Http\Controllers\AuthController::class, 'showChangePasswordForm'])->name('change.password.form');
    Route::post('/change-password', [App\Http\Controllers\AuthController::class, 'changePassword'])->name('change.password');

            // Routes cho User Management (chỉ Admin)
            Route::middleware(['auth', 'admin'])->group(function () {
                Route::get('/users', [UserController::class, 'index'])->name('users.index');
                Route::get('/users/{id}/detail', [UserController::class, 'show'])->name('users.show');
                Route::put('/users/{id}', [UserController::class, 'update'])->name('users.update');
                Route::put('/users/{id}/status', [UserController::class, 'updateStatus'])->name('users.updateStatus');
                Route::delete('/users/{id}', [UserController::class, 'destroy'])->name('users.destroy');
            });

    // Objectives Routes
    Route::resource('objectives', ObjectiveController::class);
    // Route::get('/dashboard', [ObjectiveController::class, 'dashboard'])->name('dashboard');
    // Route::get('/objectives/create/tailwind', [ObjectiveController::class, 'createTailwind'])->name('objectives.create.tailwind');

    // Key Results Routes
    Route::get('/objectives/{objective}/key-results',
    [KeyResultController::class, 'show']
    )->name('key_results.show');

    // Form tạo mới Key Result
    Route::get('/objectives/{objective}/key-results/create',
        [KeyResultController::class, 'create']
    )->name('key_results.create');

    // Lưu Key Result
    Route::post('/objectives/{objective}/key-results',
        [KeyResultController::class, 'store']
    )->name('key_results.store');

    Route::delete('/objectives/{objective}/key-results/{kr}',
        [KeyResultController::class, 'destroy']
    )->name('key_results.destroy');
});

// Phục vụ file trong storage khi thiếu symlink public/storage
Route::get('/storage/{path}', function (string $path) {
    if (Storage::disk('public')->exists($path)) {
        return Storage::disk('public')->response($path);
    }
    abort(404);
})->where('path', '.*');
