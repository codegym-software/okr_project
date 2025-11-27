<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Lấy danh sách thông báo của người dùng hiện tại.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $limit = (int) $request->integer('per_page', 10);
        $limit = max(5, min(50, $limit));

        $items = Notification::where('user_id', $user->user_id)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        $unread = Notification::where('user_id', $user->user_id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $items,
                'unread' => $unread,
            ],
        ]);
    }

    /**
     * Đánh dấu một thông báo là đã đọc.
     */
    public function markAsRead(Notification $notification): JsonResponse
    {
        $user = Auth::user();
        if ($notification->user_id !== $user->user_id) {
            return response()->json(['success' => false, 'message' => 'Không có quyền thao tác.'], 403);
        }

        if (!$notification->is_read) {
            $notification->update(['is_read' => true]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Đánh dấu tất cả thông báo là đã đọc.
     */
    public function markAllAsRead(): JsonResponse
    {
        $user = Auth::user();

        Notification::where('user_id', $user->user_id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['success' => true]);
    }
}

