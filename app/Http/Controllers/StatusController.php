<?php

namespace App\Http\Controllers;

use App\Models\Status;
use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StatusController extends Controller
{
    /**
     * List active statuses for users in the sidebar conversations (including self).
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Determine which user IDs appear in the sidebar conversations
        $conversationItems = Conversation::getConversationsForSidebar($user);

        $userIds = $conversationItems
            ->filter(function ($item) {
                return isset($item['is_user']) && $item['is_user'] && isset($item['id']);
            })
            ->pluck('id')
            ->push($user->id)
            ->unique()
            ->values();

        // Load active (non-expired) statuses for these users, ordered oldest -> newest
        $statuses = Status::with('user')
            ->whereIn('user_id', $userIds)
            ->where('expires_at', '>', now())
            ->orderBy('created_at')
            ->get();

        $data = $statuses->map(function (Status $status) {
            $imageUrl = $status->image_path
                ? Storage::url($status->image_path)
                : null;

            $musicUrl = null;
            if ($status->music_type === 'file' && $status->music_path) {
                $musicUrl = Storage::url($status->music_path);
            } elseif ($status->music_type === 'url') {
                $musicUrl = $status->music_path;
            }

            return [
                'id'         => $status->id,
                'user_id'    => $status->user_id,
                'image_url'  => $imageUrl,
                'caption'    => $status->caption,
                'music_type' => $status->music_type,
                'music_url'  => $musicUrl,
                'music_start_seconds'   => $status->music_start_seconds,
                'music_duration_seconds' => $status->music_duration_seconds,
                'expires_at' => $status->expires_at,
                'user'       => $status->user ? [
                    'id'         => $status->user->id,
                    'name'       => $status->user->name,
                    'avatar_url' => $status->user->avatar
                        ? Storage::url($status->user->avatar)
                        : null,
                ] : null,
            ];
        });

        return response()->json([
            'status' => true,
            'data'   => $data,
        ]);
    }

    /**
     * Store a newly created status.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'image'      => ['required', 'image', 'max:5120'], // max 5MB
            'caption'    => ['nullable', 'string', 'max:255'],
            'music_file' => ['nullable', 'file', 'mimetypes:audio/mpeg,audio/mp3,audio/ogg,audio/wav', 'max:10240'], // max 10MB
            'music_url'  => ['nullable', 'url', 'max:2048'],
            'music_start_seconds' => ['nullable', 'integer', 'min:0'],
            'music_duration_seconds' => ['nullable', 'integer', 'min:1', 'max:60'],
        ]);

        $imagePath = $request->file('image')->store('statuses/images', 'public');

        $musicType = null;
        $musicPath = null;

        if ($request->hasFile('music_file')) {
            $musicType = 'file';
            $musicPath = $request->file('music_file')->store('statuses/music', 'public');
        } elseif (!empty($data['music_url'])) {
            $musicType = 'url';
            $musicPath = $data['music_url'];
        }

        $duration = null;
        if ($musicType) {
            $duration = $data['music_duration_seconds'] ?? 30; // default 30s if music attached
        }

        $status = Status::create([
            'user_id'    => $user->id,
            'image_path' => $imagePath,
            'caption'    => $data['caption'] ?? null,
            'music_type' => $musicType,
            'music_path' => $musicPath,
            'music_start_seconds'   => $data['music_start_seconds'] ?? null,
            'music_duration_seconds' => $duration,
            'expires_at' => now()->addDay(), // 24h like stories
        ]);

        $imageUrl = $status->image_path
            ? Storage::url($status->image_path)
            : null;

        $musicUrl = null;
        if ($status->music_type === 'file' && $status->music_path) {
            $musicUrl = Storage::url($status->music_path);
        } elseif ($status->music_type === 'url') {
            $musicUrl = $status->music_path;
        }

        return response()->json([
            'status' => true,
            'data'   => [
                'id'         => $status->id,
                'user_id'    => $status->user_id,
                'image_url'  => $imageUrl,
                'caption'    => $status->caption,
                'music_type' => $status->music_type,
                'music_url'  => $musicUrl,
                'music_start_seconds'   => $status->music_start_seconds,
                'music_duration_seconds' => $status->music_duration_seconds,
                'expires_at' => $status->expires_at,
            ],
        ]);
    }
}
