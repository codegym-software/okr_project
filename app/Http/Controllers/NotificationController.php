<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    /**
     * Lấy danh sách thông báo của user hiện tại
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        $query = Notification::where('user_id', $user->user_id)
            ->with(['cycle'])
            ->orderBy('created_at', 'desc');

        // Lọc theo trạng thái đã đọc/chưa đọc
        if ($request->has('is_read')) {
            $query->where('is_read', $request->boolean('is_read'));
        }

        // Lọc theo type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // Phân trang
        $perPage = $request->get('per_page', 20);
        $notifications = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => [
                'notifications' => $notifications->items(),
                'unread_count' => Notification::where('user_id', $user->user_id)
                    ->where('is_read', false)
                    ->count(),
                'pagination' => [
                    'current_page' => $notifications->currentPage(),
                    'last_page' => $notifications->lastPage(),
                    'per_page' => $notifications->perPage(),
                    'total' => $notifications->total(),
                ]
            ]
        ]);
    }

    /**
     * Đánh dấu thông báo là đã đọc
     */
    public function markAsRead(Request $request, $notificationId): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        $notification = Notification::where('user_id', $user->user_id)
            ->findOrFail($notificationId);

        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Đã đánh dấu thông báo là đã đọc',
            'data' => $notification->fresh()
        ]);
    }

    /**
     * Đánh dấu tất cả thông báo là đã đọc
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        $updated = Notification::where('user_id', $user->user_id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'message' => "Đã đánh dấu {$updated} thông báo là đã đọc",
            'data' => [
                'updated_count' => $updated
            ]
        ]);
    }

    /**
     * Lấy số lượng thông báo chưa đọc
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        $count = Notification::where('user_id', $user->user_id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'unread_count' => $count
            ]
        ]);
    }

    /**
     * Xóa thông báo
     */
    public function destroy(Request $request, $notificationId): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated'
            ], 401);
        }

        $notification = Notification::where('user_id', $user->user_id)
            ->findOrFail($notificationId);

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa thông báo'
        ]);
    }
}
