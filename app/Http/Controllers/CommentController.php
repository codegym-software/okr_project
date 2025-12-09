<?php

namespace App\Http\Controllers;

use App\Models\Objective;
use App\Models\Comment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CommentController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @param  \App\Models\Objective  $objective
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Objective $objective)
    {
        $comments = $objective->comments()
            ->with(['user', 'replies.user']) // Eager load user and replies with their users
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($comments);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Objective  $objective
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request, Objective $objective)
    {
        $request->validate([
            'content' => 'required|string|max:2000',
            'parent_id' => 'nullable|exists:comments,id',
        ]);

        $comment = $objective->comments()->create([
            'content' => $request->content,
            'parent_id' => $request->parent_id,
            'user_id' => Auth::id(),
        ]);
        
        // Eager load relationships for the frontend
        $comment->load(['user', 'replies.user']);

        // Gửi thông báo
        $commenterName = Auth::user()->full_name ?? Auth::user()->email;
        $objTitle = $objective->obj_title;
        $isMyObjective = request()->header('Referer') && str_contains(request()->header('Referer'), '/my-objectives/');
        // Chỉ lưu path và query params, không lưu domain để bảo mật
        $actionUrl = $isMyObjective 
            ? "/my-objectives/details/{$objective->objective_id}?tab=history"
            : "/company-okrs/detail/{$objective->objective_id}?tab=history";
        
        // Nếu là reply, gửi thông báo cho người được reply
        if ($request->parent_id) {
            $parentComment = Comment::with('user')->find($request->parent_id);
            if ($parentComment && $parentComment->user_id && $parentComment->user_id != Auth::id()) {
                try {
                    \App\Services\NotificationService::send(
                        $parentComment->user_id,
                        "{$commenterName} đã trả lời bình luận của bạn trên Objective \"{$objTitle}\"",
                        'comment',
                        $objective->cycle_id,
                        $actionUrl,
                        'Xem bình luận',
                        true
                    );
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('CommentController: Error sending notification to parent comment user', [
                        'error' => $e->getMessage(),
                        'parent_comment_user_id' => $parentComment->user_id,
                    ]);
                }
            }
        }
        
        // Gửi thông báo đến người được gán Objective (nếu không phải người comment và không phải người được reply)
        // Ưu tiên: người được gán (assignments) > người sở hữu (user_id)
        $objective->load('assignments.user');
        $assignedUserId = null;
        
        // Kiểm tra xem có assignments không
        if ($objective->assignments && $objective->assignments->isNotEmpty()) {
            // Lấy user_id từ assignment đầu tiên (hoặc có thể lấy tất cả nếu cần gửi cho nhiều người)
            $assignedUserId = $objective->assignments->first()->user_id;
        }
        
        // Nếu không có assignment, dùng user_id (người sở hữu)
        $ownerId = $assignedUserId ?? $objective->user_id;
        $parentCommentUserId = $request->parent_id ? Comment::find($request->parent_id)?->user_id : null;
        
        if ($ownerId && $ownerId != Auth::id() && $ownerId != $parentCommentUserId) {
            try {
                \App\Services\NotificationService::send(
                    $ownerId,
                    "{$commenterName} đã bình luận trên Objective \"{$objTitle}\"",
                    'comment',
                    $objective->cycle_id,
                    $actionUrl,
                    'Xem bình luận',
                    true
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('CommentController: Error sending notification to objective owner/assignee', [
                    'error' => $e->getMessage(),
                    'owner_id' => $ownerId,
                    'is_assigned' => $assignedUserId !== null,
                ]);
            }
        }

        return response()->json($comment, 201);
    }

    /**
     * Store a newly created comment for a Key Result.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  string $krId
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeForKr(Request $request, $krId)
    {
        $request->validate([
            'content' => 'required|string|max:2000',
            'parent_id' => 'nullable|exists:comments,id',
        ]);

        $keyResult = \App\Models\KeyResult::findOrFail($krId);

        $comment = $keyResult->comments()->create([
            'content' => $request->content,
            'parent_id' => $request->parent_id,
            'user_id' => Auth::id(),
        ]);

        // Eager load relationships for the frontend
        $comment->load(['user', 'replies.user']);

        // Gửi thông báo
        $commenterName = Auth::user()->full_name ?? Auth::user()->email;
        $krTitle = $keyResult->kr_title;
        $isMyKeyResult = request()->header('Referer') && str_contains(request()->header('Referer'), '/my-objectives/');
        // Chỉ lưu path và query params, không lưu domain để bảo mật
        $actionUrl = $isMyKeyResult 
            ? "/my-objectives/key-result-details/{$krId}?tab=history"
            : "/company-okrs/detail/kr/{$krId}?tab=history";
        
        // Nếu là reply, gửi thông báo cho người được reply
        if ($request->parent_id) {
            $parentComment = Comment::with('user')->find($request->parent_id);
            if ($parentComment && $parentComment->user_id && $parentComment->user_id != Auth::id()) {
                try {
                    \App\Services\NotificationService::send(
                        $parentComment->user_id,
                        "{$commenterName} đã trả lời bình luận của bạn trên Key Result \"{$krTitle}\"",
                        'comment',
                        $keyResult->cycle_id,
                        $actionUrl,
                        'Xem bình luận',
                        true
                    );
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('CommentController: Error sending notification to parent comment user (KR)', [
                        'error' => $e->getMessage(),
                        'parent_comment_user_id' => $parentComment->user_id,
                    ]);
                }
            }
        }
        
        // Gửi thông báo đến người sở hữu KR (nếu không phải người comment và không phải người được reply)
        $ownerId = $keyResult->assigned_to ?? $keyResult->user_id;
        $parentCommentUserId = $request->parent_id ? Comment::find($request->parent_id)?->user_id : null;
        if ($ownerId && $ownerId != Auth::id() && $ownerId != $parentCommentUserId) {
            try {
                \App\Services\NotificationService::send(
                    $ownerId,
                    "{$commenterName} đã bình luận trên Key Result \"{$krTitle}\"",
                    'comment',
                    $keyResult->cycle_id,
                    $actionUrl,
                    'Xem bình luận',
                    true
                );
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('CommentController: Error sending notification to KR owner', [
                    'error' => $e->getMessage(),
                    'owner_id' => $ownerId,
                ]);
            }
        }

        return response()->json($comment, 201);
    }
}
