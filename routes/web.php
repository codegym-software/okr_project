<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CycleController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ObjectiveController;
use App\Http\Controllers\KeyResultController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\MyObjectiveController;
use App\Http\Controllers\MyKeyResultController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\CheckInController;
use App\Http\Controllers\OkrAssignmentController;
use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;
use App\Http\Controllers\LinkController;


Route::get('/', function () {
    return view('app');
});

// Landing Page - hiển thị nút đăng nhập
Route::get('/landingpage', function () {
    return view('app');
})->name('landingpage');

Route::group(['middleware' => ['web', 'check.status', 'timezone']], function () {
    // Route xác thực - Sử dụng giao diện riêng (không qua Cognito Hosted UI)
    Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->name('login.post');
    Route::get('/signup', [AuthController::class, 'showSignupForm'])->name('signup');
    Route::post('/signup', [AuthController::class, 'signup'])->name('signup.post');
    Route::get('/forgot-password', [AuthController::class, 'showForgotPasswordForm'])->name('forgot-password');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('forgot-password.post');
    Route::post('/confirm-forgot-password', [AuthController::class, 'confirmForgotPassword'])->name('confirm-forgot-password');
    
    // Google OAuth (redirect trực tiếp đến Google, không qua Cognito Hosted UI)
    Route::get('/auth/google', [AuthController::class, 'redirectToGoogle'])->name('auth.google');
    Route::get('/auth/google-callback', [AuthController::class, 'handleGoogleCallback'])->name('auth.google.callback');
    
    // Debug route để kiểm tra redirect URI
    Route::get('/debug/google-oauth', function() {
        $redirectUri = config('services.google.redirect');
        $clientId = config('services.google.client_id');
        
        return response()->json([
            'redirect_uri_from_config' => $redirectUri,
            'redirect_uri_from_env' => env('GOOGLE_REDIRECT_URI'),
            'redirect_uri_default' => 'http://localhost:8000/auth/google-callback',
            'client_id' => $clientId ? 'Configured' : 'Not configured',
            'expected_uri' => 'http://localhost:8000/auth/google-callback',
            'match' => ($redirectUri === 'http://localhost:8000/auth/google-callback'),
        ]);
    })->name('debug.google.oauth');
    
    // Cognito callback (giữ lại cho tương thích nếu cần)
    Route::get('/auth/callback', [AuthController::class, 'handleCallback'])->name('auth.callback');
    Route::post('/auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
    
    // Redirect cũ cho tương thích
    Route::get('/auth/signup', [AuthController::class, 'redirectToSignup'])->name('auth.signup');
    Route::get('/auth/forgot', function() {
        return redirect()->route('forgot-password');
    })->name('auth.forgot');

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
    Route::get('/cycles',[CycleController::class,'index'])->name('cycles.index');
    Route::post('/cycles',[CycleController::class,'store'])->middleware('auth','admin')->name('cycles.store');
    Route::get('/cycles/{cycle}/detail',[CycleController::class,'show'])->name('cycles.show');
    Route::put('/cycles/{cycle}',[CycleController::class,'update'])->middleware('auth','admin')->name('cycles.update');
    Route::delete('/cycles/{cycle}',[CycleController::class,'destroy'])->middleware('auth','admin')->name('cycles.destroy');
    Route::get('/cycles/create',[CycleController::class,'create'])->middleware('auth','admin')->name('cycles.create');
    Route::post('/cycles/create',[CycleController::class,'store'])->middleware('auth','admin')->name('cycles.store.create');
    Route::post('/cycles/{cycle}/close',[CycleController::class,'close'])->middleware('auth','admin')->name('cycles.close');

    //Routes cho Department
    Route::resource('departments', DepartmentController::class);
    Route::post('/departments/{department}/assign-users', [DepartmentController::class, 'storeAssignUsers'])->name('departments.assign.users.store');

    //Routes cho Report - chỉ Manager
    Route::get('/reports', [App\Http\Controllers\ReportController::class, 'index'])->middleware(['auth', \App\Http\Middleware\ManagerOnly::class])->name('reports.index');
    Route::get('/api/reports/my-team', [App\Http\Controllers\ReportController::class, 'getMyTeamReport'])->middleware(['auth', \App\Http\Middleware\ManagerOnly::class])->name('api.reports.my-team');
    Route::get('/api/reports/cycles', [App\Http\Controllers\ReportController::class, 'getCycles'])->middleware(['auth', \App\Http\Middleware\ManagerOnly::class])->name('api.reports.cycles');
    Route::get('/api/reports/progress-trend', [App\Http\Controllers\ReportController::class, 'getTeamProgressTrend'])->middleware(['auth', \App\Http\Middleware\ManagerOnly::class])->name('api.reports.progress-trend');

    // Routes cho Profile - trả về React app
    Route::get('/profile', function () {
        return view('app');
    })->middleware('auth')->name('profile.show');
    Route::post('/profile', [ProfileController::class, 'update'])->middleware('auth')->name('profile.update');
    
    // API Routes cho Profile (trả về JSON)
    Route::get('/api/profile', [ProfileController::class, 'show'])->middleware('auth');
    Route::post('/api/profile', [ProfileController::class, 'update'])->middleware('auth');
    Route::get('/change-password', function () {
        return view('app');
    })->middleware('auth')->name('change.password.form');
    Route::post('/change-password', [App\Http\Controllers\AuthController::class, 'changePassword'])->middleware('auth')->name('change.password');

    // Notifications
    Route::middleware('auth')->group(function () {
        Route::get('/api/notifications', [NotificationController::class, 'index'])->name('notifications.index');
        Route::post('/api/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.markAllRead');
        Route::post('/api/notifications/{notification}/read', [NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');
    });

            // Routes cho User Management (chỉ Admin)
            Route::middleware(['auth', 'admin'])->group(function () {
                Route::get('/users/{id}/detail', [UserController::class, 'show'])->name('users.show');
                Route::get('/roles', [UserController::class, 'getAllRoles'])->name('roles.all');
                Route::get('/roles-by-level', [UserController::class, 'getRolesByLevel'])->name('roles.by.level');
                Route::put('/users/{id}', [UserController::class, 'update'])->name('users.update');
                Route::put('/users/{id}/status', [UserController::class, 'updateStatus'])->name('users.updateStatus');
                Route::delete('/users/{id}', [UserController::class, 'destroy'])->name('users.destroy');
                
                // Routes cho Admin functions
                Route::post('/admin/invite-user', [AdminController::class, 'inviteUser'])->name('admin.invite-user');
                Route::get('/admin/invitations', [AdminController::class, 'getInvitations'])->name('admin.invitations');
            });
                // Route::get('/users', [UserController::class, 'index'])->name('users.index');
            Route::get('/users', [UserController::class, 'index'])
                ->name('users.index')
                ->middleware(\App\Http\Middleware\RestrictToAdminOrUnitManager::class);

    // Route::get('/users2', [UserController::class, 'index2']);

    // // Objectives Routes
    // Route::resource('objectives', ObjectiveController::class);
    // // Route::get('/dashboard', [ObjectiveController::class, 'dashboard'])->name('dashboard');

    // // Key Results Routes
    // Route::get('/objectives/{objective}/key-results', 
    // [KeyResultController::class, 'index'])
    // ->name('key_results.index');

    // Route::get('/objectives/{objective}/key-results/{key_result}', 
    // [KeyResultController::class, 'show'])
    // ->whereNumber('key_result')
    // ->name('key_results.show');

    // // Form tạo mới Key Result
    // Route::get('/objectives/{objective}/key-results/create',
    //     [KeyResultController::class, 'create']
    // )->name('key_results.create');

    // // Lưu Key Result
    // Route::post('/objectives/{objective}/key-results',
    //     [KeyResultController::class, 'store']
    // )->name('key_results.store');

    // // Cập nhật Key Result
    // Route::put('/objectives/{objective}/key-results/{kr}',
    //     [KeyResultController::class, 'update']
    // )->name('key_results.update');

    // Route::delete('/objectives/{objective}/key-results/{kr}',
    //     [KeyResultController::class, 'destroy']
    // )->name('key_results.destroy');

    Route::prefix('my-objectives')->group(function () {
        Route::get('/', [MyObjectiveController::class, 'index'])
            ->middleware('auth')
            ->name('my-objectives.index');
        Route::get('/create', [MyObjectiveController::class, 'create'])
            ->middleware('auth')
            ->name('my-objectives.create');
        Route::post('/store', [MyObjectiveController::class, 'store'])
            ->middleware('auth')
            ->name('my-objectives.store');
        Route::get('/edit/{id}', [MyObjectiveController::class, 'edit'])
            ->middleware('auth')
            ->name('my-objectives.edit');
        Route::put('/update/{id}', [MyObjectiveController::class, 'update'])
            ->middleware('auth')
            ->name('my-objectives.update');
        Route::delete('/destroy/{id}', [MyObjectiveController::class, 'destroy'])
            ->middleware('auth')
            ->name('my-objectives.destroy');
        Route::get('/details/{id}', [MyObjectiveController::class, 'getObjectiveDetails'])
            ->middleware('auth')
            ->name('my-objectives.details');
        Route::get('/key-result-details/{id}', [MyObjectiveController::class, 'getKeyResultDetails'])
            ->middleware('auth')
            ->name('my-objectives.key-result-details');
        Route::get('/getAllowedLevelsApi', [MyObjectiveController::class, 'getAllowedLevelsApi'])
            ->middleware('auth')
            ->name('my-objectives.getAllowedLevelsApi');
        Route::get('/user-levels', [MyObjectiveController::class, 'getUserLevels'])
            ->middleware('auth')
            ->name('my-objectives.user-levels');
        Route::post('/{id}/archive', [MyObjectiveController::class, 'archive'])
            ->middleware('auth')
            ->name('my-objectives.archive');
        Route::post('/{id}/unarchive', [MyObjectiveController::class, 'unarchive'])
            ->middleware('auth')
            ->name('my-objectives.unarchive');
        Route::delete('/{id}', [MyObjectiveController::class, 'destroy'])  
            ->middleware('auth')
            ->name('my-objectives.destroy');
    });

    Route::prefix('my-key-results')->group(function () {
        Route::get('/', function () {
            return view('app');
        })->middleware('auth')->name('my-key-results.index');
        Route::get('/create/{objectiveId}', function () {
            return view('app');
        })->middleware('auth')->name('my-key-results.create');
        Route::post('/store', [MyKeyResultController::class, 'store'])->middleware('auth')->name('my-key-results.store');
        Route::get('/edit/{objectiveId}/{keyResultId}', function () {
            return view('app');
        })->middleware('auth')->name('my-key-results.edit');
        Route::put('/update/{objectiveId}/{keyResultId}', [MyKeyResultController::class, 'update'])->middleware('auth')->name('my-key-results.update');
        Route::delete('/destroy/{objectiveId}/{keyResultId}', [MyKeyResultController::class, 'destroy'])->middleware('auth')->name('my-key-results.destroy');
        Route::post('/{objectiveId}/{keyResultId}/archive', [MyKeyResultController::class, 'archive'])
            ->name('my-key-results.archive');
        Route::post('/{objectiveId}/{keyResultId}/unarchive', [MyKeyResultController::class, 'unarchive'])
            ->name('my-key-results.unarchive');
            Route::post('/{objectiveId}/{keyResultId}/assign', [MyKeyResultController::class, 'assign'])
            ->name('my-key-results.assign');
        Route::delete('/{id}', [MyKeyResultController::class, 'destroy'])  
            ->middleware('auth')
            ->name('my-key-result.destroy');
    });

    // Company OKR Routes - yêu cầu đăng nhập
    Route::get('/company-okrs', [App\Http\Controllers\CompanyOkrController::class, 'index'])
        ->middleware('auth')
        ->name('company.okrs');
    Route::get('/company-okrs/{id}', [App\Http\Controllers\CompanyOkrController::class, 'show'])
        ->middleware('auth')
        ->name('company.okrs.show');

    // Check-in Routes
    Route::prefix('check-in')->middleware('auth')->group(function () {
        Route::get('/{objectiveId}/{krId}', [CheckInController::class, 'create'])->name('check-in.create');
        Route::post('/{objectiveId}/{krId}', [CheckInController::class, 'store'])->name('check-in.store');
        Route::get('/{objectiveId}/{krId}/history', [CheckInController::class, 'history'])->name('check-in.history');
        Route::delete('/{objectiveId}/{krId}/{checkInId}', [CheckInController::class, 'destroy'])->name('check-in.destroy');
    });

    // API Check-in Routes (for JSON responses)
    Route::prefix('api/check-in')->middleware('auth')->group(function () {
        Route::get('/{objectiveId}/{krId}/history', [CheckInController::class, 'getHistory'])->name('api.check-in.history');
    });

    // Reports API (Admin hoặc CEO)
    Route::prefix('api/reports')->middleware(['auth', \App\Http\Middleware\AdminOrCeo::class])->group(function () {
        Route::get('/company-overview', [\App\Http\Controllers\ReportController::class, 'companyOverview'])
            ->name('api.reports.company-overview');
        Route::get('/okr-company', [\App\Http\Controllers\ReportController::class, 'companyOkrReport'])
            ->name('api.reports.okr-company');
        Route::get('/okr-company/export.csv', [\App\Http\Controllers\ReportController::class, 'exportCompanyOkrCsv'])
            ->name('api.reports.okr-company.export.csv');
    });

    // Frontend page route for Reports (SPA) - Admin hoặc CEO
    Route::get('/reports/company-overview', function() { return view('app'); })
        ->middleware(['auth', \App\Http\Middleware\AdminOrCeo::class])
        ->name('reports.company-overview');
    Route::get('/reports/okr-company', function() { return view('app'); })
        ->middleware(['auth', \App\Http\Middleware\AdminOrCeo::class])
        ->name('reports.okr-company');

    // OKR Assignments
    Route::prefix('my-links')->group(function () {
        Route::get('/', [LinkController::class, 'index'])->middleware('auth')->name('my-links.index');
        Route::get('/available-targets', [LinkController::class, 'getAvailableTargets'])->middleware('auth')->name('my-links.available-targets');
        Route::post('/store', [LinkController::class, 'store'])->middleware('auth')->name('my-links.store');
        Route::post('/{link}/approve', [LinkController::class, 'approve'])->middleware('auth')->name('my-links.approve');
        Route::post('/{link}/reject', [LinkController::class, 'reject'])->middleware('auth')->name('my-links.reject');
        Route::post('/{link}/request-changes', [LinkController::class, 'requestChanges'])->middleware('auth')->name('my-links.request-changes');
        Route::post('/{link}/cancel', [LinkController::class, 'cancel'])->middleware('auth')->name('my-links.cancel');
    });

});

// Phục vụ file trong storage khi thiếu symlink public/storage
Route::get('/storage/{path}', function ($path) {
    $path = storage_path('app/public/' . $path);
    
    if (!File::exists($path)) {
        abort(404);
    }
    
    $file = File::get($path);
    $type = File::mimeType($path);
    
    $response = response($file, 200)->header("Content-Type", $type);
    
    return $response;
})->where('path', '.*');
