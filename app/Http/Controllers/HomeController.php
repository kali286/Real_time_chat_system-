<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\User;
use App\Models\Group;

class HomeController extends Controller
{
    public function home()
    {
        if (!auth()->check()) {
            return redirect()->route('login');
        }

        $user = auth()->user();
        
        // Get all users except current user
        $users = User::where('id', '!=', $user->id)
            ->orderBy('name')
            ->get()
            ->map(function($u) use ($user) {
                return $u->toConversationArrayFor($user);
            });

        // Get user's groups
        $groups = Group::getGroupsForUser($user)
            ->map(function($group) use ($user) {
                return $group->toConversationArrayFor($user);
            });

        // Combine users and groups into conversations
        $conversations = $users->concat($groups)->sortByDesc('last_message_date');

        return Inertia::render('Home', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_admin' => $user->is_admin,
                'avatar' => $user->avatar,
            ],
            'conversations' => $conversations->values()->all(),
            'selectedConversation' => null, // No conversation selected by default
            'messages' => [] // No messages loaded by default
        ]);
    }
}
