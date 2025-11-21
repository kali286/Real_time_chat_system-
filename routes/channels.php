<?php
use App\Http\Resources\UserResource;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\User;

Broadcast::channel('online', function (User $user) {
    return $user ? new UserResource($user) : null;
});

Broadcast::channel('message.user.{userId1}-{userId2}', function (User $user, int $userId1, int $userId2) {
    try {
        $authorized = ($user->id === $userId1 || $user->id === $userId2);
        return $authorized ? $user : null;
    } catch (\Exception $e) {
        Log::error('Error authorizing user message channel', [
            'user_id' => $user->id,
            'userId1' => $userId1,
            'userId2' => $userId2,
            'error' => $e->getMessage()
        ]);
        return null;
    }
});

Broadcast::channel('message.group.{groupId}', function (User $user, int $groupId) {
    try {
        // Check if user is a member of the group
        $isMember = DB::table('group_users')
            ->where('user_id', $user->id)
            ->where('group_id', $groupId)
            ->exists();
        return $isMember ? $user : null;
    } catch (\Exception $e) {
        Log::error('Error authorizing group message channel', [
            'user_id' => $user->id,
            'groupId' => $groupId,
            'error' => $e->getMessage()
        ]);
        return null;
    }
});

Broadcast::channel('group.deleted.{groupId}', function (User $user, int $groupId) {
    try {
        // Check if user is a member of the group
        $isMember = DB::table('group_users')
            ->where('user_id', $user->id)
            ->where('group_id', $groupId)
            ->exists();
        return $isMember ? $user : null;
    } catch (\Exception $e) {
        Log::error('Error authorizing group deleted channel', [
            'user_id' => $user->id,
            'groupId' => $groupId,
            'error' => $e->getMessage()
        ]);
        return null;
    }
});

Broadcast::channel('user.{userId}', function (User $user, int $userId) {
    return (int) $user->id === (int) $userId ? $user : null;
});
