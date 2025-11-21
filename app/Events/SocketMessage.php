<?php

namespace App\Events;

use App\Http\Resources\MessageResource;
use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SocketMessage implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
        public function __construct(public Message $message, public ?string $temp_id = null)
    {
        //
    }

    public function broadcastWith(): array
       {
            $payload = [
                     'message' => new MessageResource($this->message),
            ];
            if ($this->temp_id) {
                    $payload['temp_id'] = $this->temp_id;
            }
            return $payload;

    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $m = $this->message;
        
        if ($m->group_id) {
            return [
                new PrivateChannel('message.group.' . $m->group_id)
            ];
        }
        
        // For user messages, sort IDs to ensure consistent channel names
        return [
            new PrivateChannel('message.user.' . collect([$m->sender_id, $m->receiver_id])->sort()->implode('-'))
        ];
    }
}
