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
        
        // Eager load the user relationship for the frontend
        $comment->load('user');

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

        // Eager load the user relationship for the frontend
        $comment->load('user');

        return response()->json($comment, 201);
    }
}
