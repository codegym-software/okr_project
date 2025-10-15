<?php

namespace App\Http\Controllers;

use App\Models\OkrAssignment;
use App\Models\Objective;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class OkrAssignmentController extends Controller
{
    /**
     * Lấy danh sách (trống vì không cần vai trò hay phòng ban).
     */
    public function getAssignableUsersAndRoles(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            Log::error('OkrAssignmentController.getAssignableUsersAndRoles: Unauthenticated user');
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        return response()->json([
            'success' => true,
            'data' => [],
        ]);
    }

    /**
     * Gán Objective cho người dùng dựa trên email.
     */
    public function store(Request $request): JsonResponse
    {
        Log::info('OkrAssignmentController.store: Request received', ['request' => $request->all()]);

        $user = Auth::user();
        if (!$user) {
            Log::error('OkrAssignmentController.store: Unauthenticated user');
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $validated = $request->validate([
            'email' => 'required|email|exists:users,email',
            'objective_id' => 'required|exists:objectives,objective_id',
        ]);
        Log::info('OkrAssignmentController.store: Validated data', $validated);

        // Tìm user_id từ email
        $targetUser = User::where('email', $validated['email'])->first();
        Log::info('OkrAssignmentController.store: Target user found', ['user_id' => $targetUser->user_id]);

        // Kiểm tra quyền gán
        if (!$this->canAssignToUser($user, $targetUser->user_id)) {
            Log::warning('OkrAssignmentController.store: Permission denied for user assignment', [
                'user_id' => $user->user_id,
                'target_user_id' => $targetUser->user_id
            ]);
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền gán cho người dùng này.'], 403);
        }

        // Kiểm tra quyền truy cập Objective
        $objective = Objective::findOrFail($validated['objective_id']);
        if ($objective->user_id !== $user->user_id) {
            Log::warning('OkrAssignmentController.store: Permission denied for objective', [
                'objective_id' => $validated['objective_id'],
                'user_id' => $user->user_id
            ]);
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền gán Objective này.'], 403);
        }

        try {
            $assignment = DB::transaction(function () use ($validated, $targetUser) {
                // Kiểm tra xem đã gán chưa để tránh trùng lặp
                $existing = OkrAssignment::where([
                    'user_id' => $targetUser->user_id,
                    'objective_id' => $validated['objective_id'],
                ])->first();

                if ($existing) {
                    Log::info('OkrAssignmentController.store: Assignment already exists', [
                        'assignment_id' => $existing->assignment_id
                    ]);
                    return $existing;
                }

                $assignment = OkrAssignment::create([
                    'user_id' => $targetUser->user_id,
                    'objective_id' => $validated['objective_id'],
                    'kr_id' => null, // Tạm thời không gán Key Result
                ]);
                Log::info('OkrAssignmentController.store: Assignment created', [
                    'assignment_id' => $assignment->assignment_id
                ]);
                return $assignment;
            });

            return response()->json([
                'success' => true,
                'message' => 'Gán Objective thành công!',
                'data' => $assignment->load(['user', 'objective']),
            ]);
        } catch (\Exception $e) {
            Log::error('OkrAssignmentController.store: Failed to create assignment', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['success' => false, 'message' => 'Gán Objective thất bại: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Xóa gán Objective.
     */
    public function destroy(string $id): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            Log::error('OkrAssignmentController.destroy: Unauthenticated user');
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $assignment = OkrAssignment::with(['objective'])->findOrFail($id);

        // Kiểm tra quyền: Chỉ chủ sở hữu của Objective được xóa
        if ($assignment->objective_id && $assignment->objective->user_id !== $user->user_id) {
            Log::warning('OkrAssignmentController.destroy: Permission denied for assignment', [
                'assignment_id' => $id,
                'user_id' => $user->user_id
            ]);
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xóa gán này.'], 403);
        }

        try {
            DB::transaction(function () use ($assignment) {
                $assignment->delete();
            });
            Log::info('OkrAssignmentController.destroy: Assignment deleted', ['assignment_id' => $id]);
            return response()->json(['success' => true, 'message' => 'Xóa gán Objective thành công!']);
        } catch (\Exception $e) {
            Log::error('OkrAssignmentController.destroy: Failed to delete assignment', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['success' => false, 'message' => 'Xóa gán Objective thất bại: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Kiểm tra xem người dùng có quyền gán cho user_id cụ thể không.
     */
    private function canAssignToUser($user, $targetUserId): bool
    {
        if ($user->user_id == $targetUserId) {
            return true; // Có thể gán cho chính mình
        }

        $roleName = $user->role ? $user->role->role_name : null;
        if ($roleName === 'admin') {
            return true; // Admin gán cho bất kỳ ai
        }

        if ($roleName === 'manager') {
            $targetUser = User::find($targetUserId);
            if (!$targetUser || !$targetUser->role || !$targetUser->department_id) {
                Log::warning('OkrAssignmentController.canAssignToUser: Invalid target user data', [
                    'target_user_id' => $targetUserId
                ]);
                return false;
            }
            return $targetUser->department_id == $user->department_id && 
                   $targetUser->role->role_name === 'member';
        }

        Log::info('OkrAssignmentController.canAssignToUser: User cannot assign', [
            'user_id' => $user->user_id,
            'target_user_id' => $targetUserId
        ]);
        return false; // Members không được gán
    }
}