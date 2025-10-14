<?php

namespace App\Http\Controllers;

use App\Models\OkrAssignment;
use App\Models\Objective;
use App\Models\KeyResult;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class OkrAssignmentController extends Controller
{
    /**
     * Lấy danh sách người dùng và vai trò có thể gán.
     */
    public function getAssignableUsersAndRoles(Request $request): JsonResponse
    {
        $user = Auth::user();
        $users = $this->getAssignableUsers($user);
        $roles = Role::select('role_id', 'role_name')->get()->toArray();

        return response()->json([
            'success' => true,
            'data' => [
                'users' => $users,
                'roles' => $roles,
            ],
        ]);
    }

    /**
     * Gán Objective hoặc Key Result cho người dùng với vai trò cụ thể.
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'user_id' => 'required|exists:users,user_id',
            'role_id' => 'required|exists:roles,role_id',
            'objective_id' => 'nullable|exists:objectives,objective_id',
            'kr_id' => 'nullable|exists:key_results,kr_id',
            'department_id' => 'nullable|exists:departments,department_id',
        ]);

        // Đảm bảo chỉ một trong objective_id hoặc kr_id được cung cấp
        if (!$validated['objective_id'] && !$validated['kr_id']) {
            return response()->json(['success' => false, 'message' => 'Phải cung cấp objective_id hoặc kr_id.'], 422);
        }
        if ($validated['objective_id'] && $validated['kr_id']) {
            return response()->json(['success' => false, 'message' => 'Chỉ được cung cấp một trong objective_id hoặc kr_id.'], 422);
        }

        // Kiểm tra quyền gán
        if (!$this->canAssignToUser($user, $validated['user_id'], $validated['department_id'] ?? null)) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền gán cho người dùng này.'], 403);
        }

        // Kiểm tra quyền truy cập Objective hoặc Key Result
        if ($validated['objective_id']) {
            $objective = Objective::findOrFail($validated['objective_id']);
            if ($objective->user_id !== $user->user_id) {
                return response()->json(['success' => false, 'message' => 'Bạn không có quyền gán Objective này.'], 403);
            }
        } elseif ($validated['kr_id']) {
            $keyResult = KeyResult::with('objective')->findOrFail($validated['kr_id']);
            if ($keyResult->objective->user_id !== $user->user_id) {
                return response()->json(['success' => false, 'message' => 'Bạn không có quyền gán Key Result này.'], 403);
            }
        }

        try {
            $assignment = DB::transaction(function () use ($validated) {
                return OkrAssignment::create($validated);
            });

            return response()->json([
                'success' => true,
                'message' => 'Gán OKR thành công!',
                'data' => $assignment->load(['user', 'role', 'objective', 'keyResult', 'department']),
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Gán OKR thất bại: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Xóa gán OKR.
     */
    public function destroy(string $id): JsonResponse
    {
        $user = Auth::user();
        $assignment = OkrAssignment::with(['objective', 'keyResult'])->findOrFail($id);

        // Kiểm tra quyền: Chỉ chủ sở hữu của Objective/Key Result được xóa
        if ($assignment->objective_id && $assignment->objective->user_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xóa gán này.'], 403);
        }
        if ($assignment->kr_id && $assignment->keyResult->objective->user_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xóa gán này.'], 403);
        }

        try {
            DB::transaction(function () use ($assignment) {
                $assignment->delete();
            });

            return response()->json(['success' => true, 'message' => 'Xóa gán OKR thành công!']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Xóa gán OKR thất bại: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Lấy danh sách người dùng có thể gán dựa trên vai trò và phòng ban.
     */
    private function getAssignableUsers($user): array
    {
        $roleName = $user->role->role_name;

        if ($roleName === 'admin') {
            return User::select('user_id', 'full_name')->get()->toArray();
        }

        if ($roleName === 'manager') {
            return User::select('user_id', 'full_name')
                ->where('department_id', $user->department_id)
                ->where('role->role_name', 'member')
                ->get()
                ->toArray();
        }

        return []; // Members không được gán
    }

    /**
     * Kiểm tra xem người dùng có quyền gán cho user_id cụ thể không.
     */
    private function canAssignToUser($user, $targetUserId, $departmentId = null): bool
    {
        if ($user->user_id == $targetUserId) {
            return true; // Có thể gán cho chính mình
        }

        $roleName = $user->role->role_name;
        if ($roleName === 'admin') {
            return true; // Admin gán cho bất kỳ ai
        }

        if ($roleName === 'manager') {
            $targetUser = User::find($targetUserId);
            return $targetUser && $targetUser->department_id == $user->department_id && 
                   $targetUser->role->role_name === 'member' &&
                   (!$departmentId || $departmentId == $user->department_id);
        }

        return false; // Members không được gán
    }
}