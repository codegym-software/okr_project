<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Aws\CognitoIdentityProvider\CognitoIdentityProviderClient;
use Aws\Exception\AwsException;

class UserController extends Controller
{
    protected $cognitoClient;

    public function __construct()
    {
        // Middleware sẽ được áp dụng trong routes
        // Khởi tạo Cognito client
        $this->cognitoClient = new CognitoIdentityProviderClient([
            'region' => env('AWS_DEFAULT_REGION', 'ap-southeast-2'),
            'version' => 'latest',
            'credentials' => [
                'key' => env('AWS_ACCESS_KEY_ID'),
                'secret' => env('AWS_SECRET_ACCESS_KEY'),
            ],
        ]);
    }

    /**
     * Lấy danh sách roles theo level
     */
    public function getRolesByLevel(\Illuminate\Http\Request $request)
    {
        try {
            $level = $request->query('level');

            if (!$level) {
                return response()->json(['success' => false, 'message' => 'Thiếu tham số level'], 400);
            }

            $roles = Role::where('level', $level)->get(['role_id', 'role_name', 'description', 'level']);

            return response()->json([
                'success' => true,
                'data' => $roles
            ]);
        } catch (\Exception $e) {
            \Log::error('Error loading roles by level: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Không thể tải danh sách vai trò.'], 500);
        }
    }

    /**
     * Lấy tất cả roles
     */
    public function getAllRoles()
    {
        try {
            $roles = Role::all(['role_id', 'role_name', 'description', 'level']);

            return response()->json([
                'success' => true,
                'data' => $roles
            ]);
        } catch (\Exception $e) {
            \Log::error('Error loading all roles: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Không thể tải danh sách vai trò.'], 500);
        }
    }

    /**
     * Hiển thị danh sách người dùng
     */
    public function index(\Illuminate\Http\Request $request)
    {
        try {
            $q = strtolower((string)$request->query('q', ''));
            $role = strtolower((string)$request->query('role', ''));
            $status = strtolower((string)$request->query('status', ''));
            $departmentId = $request->query('department_id');

            $query = User::with(['role', 'department'])->orderBy('user_id', 'asc');

            if ($q !== '') {
                $query->where(function($w) use ($q){
                    $w->whereRaw('LOWER(full_name) LIKE ?', ['%'.$q.'%'])
                      ->orWhereRaw('LOWER(email) LIKE ?', ['%'.$q.'%']);
                });
            }
            if ($role !== '') {
                $query->whereHas('role', function($r) use ($role){ $r->whereRaw('LOWER(role_name) = ?', [$role]); });
            }
            if ($status !== '') {
                $query->whereRaw('LOWER(status) = ?', [$status]);
            }
            if (!empty($departmentId)) {
                $query->where('department_id', $departmentId);
            }

            $perPage = max(1, min(100, (int) $request->query('per_page', 20)));
            $page = max(1, (int) $request->query('page', 1));
            $paginator = $query->paginate($perPage, ['*'], 'page', $page);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'data' => $paginator->items(),
                    'pagination' => [
                        'total' => $paginator->total(),
                        'per_page' => $paginator->perPage(),
                        'current_page' => $paginator->currentPage(),
                        'last_page' => $paginator->lastPage(),
                    ],
                ]);
            }

            return view('app');
        } catch (\Exception $e) {
            \Log::error('Error loading users: ' . $e->getMessage());
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Không thể tải danh sách người dùng.'], 500);
            }
            return view('app');
        }
    }

    public function show($id, \Illuminate\Http\Request $request)
    {
        $user = User::with(['role', 'department'])->findOrFail($id);
        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'data' => $user]);
        }
        return view('app');
    }

    /**
     * Cập nhật vai trò người dùng
     */
    public function update(Request $request, $id)
    {
        // Middleware đã kiểm tra quyền Admin

        // Chấp nhận cả role_id hoặc role (theo tên: admin/manager/member)
        $request->validate([
            'role_id' => 'nullable|exists:roles,role_id',
            'role' => 'nullable|string|in:admin,manager,member,Admin,Manager,Member',
            'department_id' => 'nullable|exists:departments,department_id',
            'level' => 'nullable|string|in:company,unit,team,person',
            'status' => 'nullable|in:active,inactive',
        ]);

        $user = User::findOrFail($id);

        // Không cho phép thay đổi vai trò của Admin, nhưng vẫn cho phép cập nhật phòng ban
        $isChangingRole = $request->filled('role_id') || $request->filled('role');
        if ($user->isAdmin() && $isChangingRole) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Không thể thay đổi vai trò của Admin.'], 400);
            }
            return redirect()->back()->withErrors('Không thể thay đổi vai trò của Admin.');
        }

        // Kiểm tra xem có thể thay đổi vai trò không
        if ($user->user_id === Auth::id() && !Auth::user()->isAdmin()) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Bạn không thể thay đổi vai trò của chính mình.'], 400);
            }
            return redirect()->back()->withErrors('Bạn không thể thay đổi vai trò của chính mình.');
        }

        $oldRole = $user->role ? $user->role->role_name : 'Chưa có vai trò';

        // Xác định role_id (nếu có yêu cầu thay đổi vai trò)
        $roleId = null;
        if ($isChangingRole) {
            $roleId = $request->role_id;
            if (!$roleId && $request->filled('role')) {
                $name = strtolower($request->role);
                $roleId = Role::whereRaw('LOWER(role_name) = ?', [$name])->value('role_id');
            }
            if (!$roleId) {
                if ($request->expectsJson()) {
                    return response()->json(['success' => false, 'message' => 'Thiếu role hoặc role_id hợp lệ.'], 422);
                }
                return redirect()->back()->withErrors('Thiếu role hoặc role_id hợp lệ.');
            }
        }

        // Áp dụng thay đổi
        if (!is_null($roleId)) {
            $user->role_id = $roleId;
        }
        if ($request->filled('department_id')) {
            $user->department_id = $request->department_id;
        }
        if ($request->filled('status')) {
            $user->status = $request->status;
        }

        // Cập nhật cấp độ nếu có - tìm role phù hợp với level và role_name hiện tại
        if ($request->filled('level')) {
            $user->load('role');
            if ($user->role) {
                // Tìm role phù hợp với level mới và role_name hiện tại
                $matchingRole = Role::where('level', $request->level)
                                   ->where('role_name', $user->role->role_name)
                                   ->first();

                if ($matchingRole) {
                    // Chỉ thay đổi role_id để trỏ đến role phù hợp
                    $user->role_id = $matchingRole->role_id;
                }
            }
        }

        $user->save();

        // Clear cache when user is updated
        \Cache::forget('users_list');

        // Reload relationship để có thể truy cập dữ liệu mới
        $user->load(['role','department']);
        $newRole = $user->role ? $user->role->role_name : 'Chưa có vai trò';

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => $isChangingRole ? "Đã cập nhật vai trò của {$user->full_name} từ {$oldRole} thành {$newRole}." : 'Cập nhật người dùng thành công.',
                'data' => $user,
            ]);
        }

        return redirect()->route('users.index')
            ->with('success', "Đã cập nhật vai trò của {$user->full_name} từ {$oldRole} thành {$newRole}.");
    }

    /**
     * Cập nhật trạng thái người dùng
     */
    public function updateStatus(Request $request, $id)
    {
        // Middleware đã kiểm tra quyền Admin

        $request->validate([
            'status' => 'required|in:active,inactive',
        ]);

        $user = User::findOrFail($id);

        // Không cho phép thay đổi trạng thái của Admin
        if ($user->isAdmin()) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Không thể thay đổi trạng thái của Admin.'], 400);
            }
            return redirect()->back()->withErrors('Không thể thay đổi trạng thái của Admin.');
        }

        // Không cho phép Admin tự vô hiệu hóa chính mình
        if ($user->user_id === Auth::id() && $request->status === 'inactive') {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Bạn không thể vô hiệu hóa tài khoản của chính mình.'], 400);
            }
            return redirect()->back()->withErrors('Bạn không thể vô hiệu hóa tài khoản của chính mình.');
        }

        $oldStatus = $user->status ?? 'active';
        $newStatus = $request->status;

        $user->status = $newStatus;
        $user->save();

        // Clear cache when user status is updated
        \Cache::forget('users_list');

        $statusText = $newStatus === 'active' ? 'Kích hoạt' : 'Vô hiệu hóa';

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Đã cập nhật trạng thái của {$user->full_name} thành {$statusText}."
            ]);
        }

        return redirect()->route('users.index')
            ->with('success', "Đã cập nhật trạng thái của {$user->full_name} thành {$statusText}.");
    }

    /**
     * Xóa người dùng (chỉ Admin) - Xóa cả trong Cognito và Database
     */
    public function destroy($id, Request $request)
    {
        // Middleware đã kiểm tra quyền Admin

        try {
            $user = User::findOrFail($id);

            // Không cho phép xóa Admin
            if ($user->isAdmin()) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Không thể xóa tài khoản Admin.'
                    ], 400);
                }
                return redirect()->back()->withErrors('Không thể xóa tài khoản Admin.');
            }

            // Không cho phép xóa chính mình
            if ($user->user_id === Auth::id()) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Bạn không thể xóa tài khoản của chính mình.'
                    ], 400);
                }
                return redirect()->back()->withErrors('Bạn không thể xóa tài khoản của chính mình.');
            }

            $userName = $user->full_name;
            $userEmail = $user->email;
            $cognitoSub = $user->sub; // Cognito user ID

            // Xóa trong Cognito trước (nếu có sub)
            if ($cognitoSub) {
                try {
                    $this->cognitoClient->adminDeleteUser([
                        'UserPoolId' => env('AWS_COGNITO_USER_POOL_ID'),
                        'Username' => $userEmail, // Cognito sử dụng email làm username
                    ]);

                    Log::info('User deleted from Cognito', [
                        'email' => $userEmail,
                        'cognito_sub' => $cognitoSub
                    ]);
                } catch (AwsException $e) {
                    // Log lỗi nhưng vẫn tiếp tục xóa trong database
                    Log::error('Failed to delete user from Cognito', [
                        'email' => $userEmail,
                        'error_code' => $e->getAwsErrorCode(),
                        'error_message' => $e->getAwsErrorMessage()
                    ]);

                    // Nếu user không tồn tại trong Cognito, vẫn tiếp tục xóa trong database
                    if ($e->getAwsErrorCode() !== 'UserNotFoundException') {
                        // Nếu lỗi khác (không phải user không tồn tại), có thể throw exception
                        // Hoặc tiếp tục xóa trong database tùy theo yêu cầu
                    }
                }
            }

            // Xóa trong database
            $user->delete();

            // Clear cache
            \Cache::forget('users_list');

            Log::info('User deleted from database', [
                'user_id' => $id,
                'email' => $userEmail,
                'name' => $userName
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => "Đã xóa người dùng {$userName} khỏi hệ thống."
                ]);
            }

            return redirect()->route('users.index')
                ->with('success', "Đã xóa người dùng {$userName} khỏi hệ thống.");

        } catch (\Exception $e) {
            Log::error('Error deleting user', [
                'user_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Có lỗi xảy ra khi xóa người dùng. Vui lòng thử lại sau.'
                ], 500);
            }

            return redirect()->back()
                ->withErrors('Có lỗi xảy ra khi xóa người dùng. Vui lòng thử lại sau.');
        }
    }

    /**
     * Tìm kiếm người dùng theo tên hoặc email.
     * Có thể lọc theo department_id.
     */
    public function search(Request $request): JsonResponse
    {
        $query = $request->query('q');
        $departmentId = $request->query('department_id');

        if (empty($query)) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $lowerQuery = strtolower($query);

        $users = User::where(function ($qBuilder) use ($lowerQuery) {
                $qBuilder->where(DB::raw('LOWER(full_name)'), 'like', '%' . $lowerQuery . '%')
                         ->orWhere(DB::raw('LOWER(email)'), 'like', '%' . $lowerQuery . '%');
            })
            ->when($departmentId, function ($qBuilder) use ($departmentId) {
                $qBuilder->where('department_id', $departmentId);
            })
            ->limit(10)
            ->get(['user_id', 'full_name', 'email', 'avatar_url']);

        return response()->json(['success' => true, 'data' => $users]);
    }
}
