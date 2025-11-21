<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{

    public static $wrap = false;
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Grab message from database

        return [
            'id' => $this->id,
            'message' => $this->message,
            'sender_id' => $this->sender_id,
            'receiver_id' => $this->receiver_id,
            'sender' => new UserResource($this->sender),
            'group_id' => $this->group_id,
            'attachments' => MessageAttachmentResource::collection($this->attachments),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            // Read metadata for read receipts
            'read_by_count' => $this->when(isset($this->reads) && $this->reads !== null, function() {
                return $this->reads->count();
            }, 
            // fallback to DB query if relation not loaded
            function() {
                return \App\Models\MessageRead::where('message_id', $this->id)->count();
            }),
            'is_read_for_current_user' => (bool) (function() use ($request) {
                $user = $request->user();
                if (!$user) return false;
                // check loaded relation first
                if (isset($this->reads) && $this->reads !== null) {
                    return $this->reads->contains('user_id', $user->id);
                }
                return \App\Models\MessageRead::where('message_id', $this->id)->where('user_id', $user->id)->exists();
            })(),
        ];
    }
}
