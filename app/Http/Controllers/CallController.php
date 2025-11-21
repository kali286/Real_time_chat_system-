<?php

namespace App\Http\Controllers;

use App\Events\CallAccepted;
use App\Events\CallEnded;
use App\Events\IncomingCall;
use App\Helpers\AgoraTokenBuilder;
use App\Http\Resources\VideoCallResource;
use App\Models\CallParticipant;
use App\Models\Conversation;
use App\Models\Group;
use App\Models\User;
use App\Models\VideoCall;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CallController extends Controller
{
    /**
     * Initiate a new call
     */
    public function initiate(Request $request)
    {
        $request->validate([
            'receiver_id' => 'required_without:group_id|exists:users,id',
            'group_id' => 'required_without:receiver_id|exists:groups,id',
            'is_video' => 'boolean',
        ]);

        $user = Auth::user();
        $isVideo = $request->input('is_video', true);

        try {
            DB::beginTransaction();

            // Create call record
            $call = VideoCall::create([
                'call_type' => $request->has('group_id') ? 'group' : 'one_to_one',
                'conversation_id' => $request->receiver_id ? $this->getOrCreateConversation($user->id, $request->receiver_id) : null,
                'group_id' => $request->group_id,
                'initiated_by' => $user->id,
                'channel_name' => 'call_' . uniqid() . '_' . time(),
                'status' => 'ringing',
                'is_video' => $isVideo,
            ]);

            // Add initiator as participant
            CallParticipant::create([
                'call_id' => $call->id,
                'user_id' => $user->id,
                'status' => 'joined',
                'joined_at' => now(),
            ]);

            // Add receiver(s) as participants
            if ($request->receiver_id) {
                CallParticipant::create([
                    'call_id' => $call->id,
                    'user_id' => $request->receiver_id,
                    'status' => 'ringing',
                ]);
            } elseif ($request->group_id) {
                // Add all group members except initiator
                $group = Group::with('users')->findOrFail($request->group_id);
                foreach ($group->users as $member) {
                    if ($member->id !== $user->id) {
                        CallParticipant::create([
                            'call_id' => $call->id,
                            'user_id' => $member->id,
                            'status' => 'invited',
                        ]);
                    }
                }
            }

            DB::commit();

            // Generate Agora token for initiator
            $token = $this->generateAgoraToken($call->channel_name, $user->id);

            // Broadcast incoming call to participants
            $call->load(['initiator', 'participants.user']);
            broadcast(new IncomingCall($call))->toOthers();

            return response()->json([
                'success' => true,
                'call' => new VideoCallResource($call),
                'token' => $token,
                'appId' => config('services.agora.app_id'),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error initiating call: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to initiate call'], 500);
        }
    }

    /**
     * Join an ongoing call
     */
    public function join(VideoCall $call)
    {
        $user = Auth::user();

        // Check if user is a participant
        $participant = $call->participants()->where('user_id', $user->id)->first();
        
        if (!$participant) {
            return response()->json(['error' => 'You are not invited to this call'], 403);
        }

        if ($call->hasEnded()) {
            return response()->json(['error' => 'This call has ended'], 400);
        }

        // Update participant status
        $participant->update([
            'status' => 'joined',
            'joined_at' => now(),
        ]);

        // Update call status to ongoing if it was ringing
        if ($call->status === 'ringing') {
            $call->update([
                'status' => 'ongoing',
                'started_at' => now(),
            ]);

            // Broadcast call accepted
            broadcast(new CallAccepted($call->load(['initiator', 'participants.user'])));
        }

        // Generate Agora token
        $token = $this->generateAgoraToken($call->channel_name, $user->id);

        return response()->json([
            'success' => true,
            'call' => new VideoCallResource($call->load(['initiator', 'participants.user'])),
            'token' => $token,
            'appId' => config('services.agora.app_id'),
            'uid' => $user->id,
        ]);
    }

    /**
     * Leave a call
     */
    public function leave(VideoCall $call)
    {
        $user = Auth::user();

        $participant = $call->participants()->where('user_id', $user->id)->first();
        
        if (!$participant) {
            return response()->json(['error' => 'You are not in this call'], 403);
        }

        // Calculate duration
        $duration = $participant->joined_at 
            ? now()->diffInSeconds($participant->joined_at) 
            : 0;

        // Update participant
        $participant->update([
            'status' => 'left',
            'left_at' => now(),
            'duration' => $duration,
        ]);

        // Check if all participants have left
        $activeParticipants = $call->participants()
            ->whereIn('status', ['joined', 'ringing', 'invited'])
            ->count();

        if ($activeParticipants === 0) {
            // End the call
            $this->endCall($call);
        }

        return response()->json(['success' => true]);
    }

    /**
     * End a call (only initiator or admin)
     */
    public function end(VideoCall $call)
    {
        $user = Auth::user();

        // Check if user is initiator or admin
        if ($call->initiated_by !== $user->id && !$user->is_admin) {
            return response()->json(['error' => 'Only the call initiator or admin can end the call'], 403);
        }

        $this->endCall($call);

        return response()->json(['success' => true]);
    }

    /**
     * Reject an incoming call
     */
    public function reject(VideoCall $call)
    {
        $user = Auth::user();

        $participant = $call->participants()->where('user_id', $user->id)->first();
        
        if (!$participant) {
            return response()->json(['error' => 'You are not invited to this call'], 403);
        }

        $participant->update(['status' => 'rejected']);

        // If it's a 1-on-1 call and receiver rejects, end the call
        if ($call->call_type === 'one_to_one') {
            $call->update(['status' => 'rejected']);
            broadcast(new CallEnded($call->load(['initiator', 'participants.user'])));
        }

        return response()->json(['success' => true]);
    }

    /**
     * Get Agora token for a call
     */
    public function getToken(VideoCall $call)
    {
        $user = Auth::user();

        // Check if user is a participant
        $participant = $call->participants()->where('user_id', $user->id)->first();
        
        if (!$participant) {
            return response()->json(['error' => 'You are not in this call'], 403);
        }

        $token = $this->generateAgoraToken($call->channel_name, $user->id);

        return response()->json([
            'token' => $token,
            'channel' => $call->channel_name,
            'uid' => $user->id,
            'appId' => config('services.agora.app_id'),
        ]);
    }

    /**
     * Toggle mic status
     */
    public function toggleMic(VideoCall $call, Request $request)
    {
        $user = Auth::user();
        
        $participant = $call->participants()->where('user_id', $user->id)->first();
        
        if (!$participant) {
            return response()->json(['error' => 'You are not in this call'], 403);
        }

        $isMuted = $request->input('is_muted', !$participant->is_mic_muted);
        $participant->update(['is_mic_muted' => $isMuted]);

        return response()->json(['success' => true, 'is_mic_muted' => $isMuted]);
    }

    /**
     * Toggle video status
     */
    public function toggleVideo(VideoCall $call, Request $request)
    {
        $user = Auth::user();
        
        $participant = $call->participants()->where('user_id', $user->id)->first();
        
        if (!$participant) {
            return response()->json(['error' => 'You are not in this call'], 403);
        }

        $isOff = $request->input('is_off', !$participant->is_video_off);
        $participant->update(['is_video_off' => $isOff]);

        return response()->json(['success' => true, 'is_video_off' => $isOff]);
    }

    /**
     * Get call history
     */
    public function history(Request $request)
    {
        $user = Auth::user();

        $calls = VideoCall::whereHas('participants', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })
        ->with(['initiator', 'participants.user'])
        ->orderBy('created_at', 'desc')
        ->paginate(20);

        return VideoCallResource::collection($calls);
    }

    /**
     * Helper: End a call
     */
    private function endCall(VideoCall $call)
    {
        $callDuration = $call->started_at 
            ? now()->diffInSeconds($call->started_at) 
            : 0;

        $call->update([
            'status' => 'ended',
            'ended_at' => now(),
            'duration' => $callDuration,
        ]);

        // Update all active participants
        $call->participants()
            ->whereIn('status', ['joined', 'ringing', 'invited'])
            ->update([
                'status' => 'left',
                'left_at' => now(),
            ]);

        // Broadcast call ended
        broadcast(new CallEnded($call->load(['initiator', 'participants.user'])));
    }

    /**
     * Helper: Generate Agora Token
     */
    private function generateAgoraToken(string $channelName, int $uid): string
    {
        $appId = config('services.agora.app_id');
        $appCertificate = config('services.agora.app_certificate');
        $role = AgoraTokenBuilder::ROLE_PUBLISHER;
        $expireTime = 3600; // 1 hour

        return AgoraTokenBuilder::buildTokenWithUid(
            $appId,
            $appCertificate,
            $channelName,
            $uid,
            $role,
            $expireTime
        );
    }

    /**
     * Helper: Get or create conversation
     */
    private function getOrCreateConversation($userId1, $userId2)
    {
        $conversation = Conversation::where(function ($query) use ($userId1, $userId2) {
            $query->where('user_id1', $userId1)->where('user_id2', $userId2);
        })->orWhere(function ($query) use ($userId1, $userId2) {
            $query->where('user_id1', $userId2)->where('user_id2', $userId1);
        })->first();

        if (!$conversation) {
            $conversation = Conversation::create([
                'user_id1' => $userId1,
                'user_id2' => $userId2,
            ]);
        }

        return $conversation->id;
    }
}
