<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class UserController extends Controller
{
    public function __construct()
    {
        // Middleware will be applied in routes
    }

    /**
     * Display list of users
     */
    public function index()
    {
        try {
            // Cache users data for 5 minutes to improve performance
            $users = Cache::remember('users_list', 300, function () {
                return User::orderBy('user_id', 'asc')
                    ->get();
            });

            return view('users.index', compact('users'));
        } catch (\Exception $e) {
            Log::error('Error loading users: ' . $e->getMessage());
            return view('users.index', ['users' => collect()])
                ->with('error', 'Unable to load user list. Please try again later.');
        }
    }

    public function show($id)
    {
        $user = User::findOrFail($id);
        return view('users.show', compact('user'));
    }

    /**
     * Update user role
     */
    public function update(Request $request, $id)
    {
        // Middleware already checks for Admin rights

        $request->validate([
            'role' => 'required|in:Admin,Manager,Member',
        ]);

        $user = User::findOrFail($id);

        // Prevent changing the role of an Admin
        if ($user->role === 'Admin') {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Cannot change the role of an Admin.'], 400);
            }
            return redirect()->back()->withErrors('Cannot change the role of an Admin.');
        }

        // Prevent non-Admin users from changing their own role
        if ($user->user_id === Auth::id() && Auth::user()->role !== 'Admin') {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'You cannot change your own role.'], 400);
            }
            return redirect()->back()->withErrors('You cannot change your own role.');
        }

        $oldRole = $user->role ?? 'No role assigned';
        $user->role = $request->role;
        $user->save();

        // Clear cache when user is updated
        Cache::forget('users_list');

        $newRole = $user->role ?? 'No role assigned';

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Updated role of {$user->full_name} from {$oldRole} to {$newRole}."
            ]);
        }

        return redirect()->route('users.index')
            ->with('success', "Updated role of {$user->full_name} from {$oldRole} to {$newRole}.");
    }

    /**
     * Update user status
     */
    public function updateStatus(Request $request, $id)
    {
        // Middleware already checks for Admin rights

        $request->validate([
            'status' => 'required|in:active,inactive',
        ]);

        $user = User::findOrFail($id);

        // Prevent changing the status of an Admin
        if ($user->role === 'Admin') {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'Cannot change the status of an Admin.'], 400);
            }
            return redirect()->back()->withErrors('Cannot change the status of an Admin.');
        }

        // Prevent Admin from deactivating themselves
        if ($user->user_id === Auth::id() && $request->status === 'inactive') {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'message' => 'You cannot deactivate your own account.'], 400);
            }
            return redirect()->back()->withErrors('You cannot deactivate your own account.');
        }

        $oldStatus = $user->status ?? 'active';
        $newStatus = $request->status;

        $user->status = $newStatus;
        $user->save();

        // Clear cache when user status is updated
        Cache::forget('users_list');

        $statusText = $newStatus === 'active' ? 'Activated' : 'Deactivated';

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Updated status of {$user->full_name} to {$statusText}."
            ]);
        }

        return redirect()->route('users.index')
            ->with('success', "Updated status of {$user->full_name} to {$statusText}.");
    }

    /**
     * Delete a user (Admin only)
     */
    public function destroy($id)
    {
        // Middleware already checks for Admin rights

        $user = User::findOrFail($id);

        // Prevent deleting an Admin
        if ($user->role === 'Admin') {
            return redirect()->back()->withErrors('Cannot delete an Admin account.');
        }

        // Prevent deleting own account
        if ($user->user_id === Auth::id()) {
            return redirect()->back()->withErrors('You cannot delete your own account.');
        }

        $userName = $user->full_name;
        $user->delete();

        // Clear cache when user is deleted
        Cache::forget('users_list');

        return redirect()->route('users.index')
            ->with('success', "Deleted user {$userName}.");
    }
}