<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VideoCallResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'call_type' => $this->call_type,
            'conversation_id' => $this->conversation_id,
            'group_id' => $this->group_id,
            'channel_name' => $this->channel_name,
            'status' => $this->status,
            'is_video' => $this->is_video,
            'is_recording' => $this->is_recording,
            'started_at' => $this->started_at?->toISOString(),
            'ended_at' => $this->ended_at?->toISOString(),
            'duration' => $this->duration,
            'recording_url' => $this->recording_url,
            'created_at' => $this->created_at->toISOString(),
            
            // Agora Configuration
            'agora_app_id' => config('services.agora.app_id'),
            'agora_token' => $this->when(
                isset($this->agora_token), 
                $this->agora_token
            ),
            
            // Relationships
            'initiator' => [
                'id' => $this->initiator->id,
                'name' => $this->initiator->name,
                'avatar_url' => $this->initiator->avatar_url,
            ],
            
            'participants' => $this->whenLoaded('participants', function () {
                return $this->participants->map(function ($participant) {
                    return [
                        'id' => $participant->id,
                        'user_id' => $participant->user_id,
                        'status' => $participant->status,
                        'joined_at' => $participant->joined_at?->toISOString(),
                        'left_at' => $participant->left_at?->toISOString(),
                        'is_hand_raised' => $participant->is_hand_raised,
                        'is_mic_muted' => $participant->is_mic_muted,
                        'is_video_off' => $participant->is_video_off,
                        'user' => [
                            'id' => $participant->user->id,
                            'name' => $participant->user->name,
                            'avatar_url' => $participant->user->avatar_url,
                        ],
                    ];
                });
            }),
        ];
    }
}
