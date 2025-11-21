<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CallParticipant extends Model
{
    protected $fillable = [
        'call_id',
        'user_id',
        'joined_at',
        'left_at',
        'duration',
        'status',
        'is_hand_raised',
        'is_mic_muted',
        'is_video_off',
    ];

    protected $casts = [
        'joined_at' => 'datetime',
        'left_at' => 'datetime',
        'is_hand_raised' => 'boolean',
        'is_mic_muted' => 'boolean',
        'is_video_off' => 'boolean',
        'duration' => 'integer',
    ];

    /**
     * Get the call this participant belongs to
     */
    public function call(): BelongsTo
    {
        return $this->belongsTo(VideoCall::class, 'call_id');
    }

    /**
     * Get the user (participant)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if participant has joined
     */
    public function hasJoined(): bool
    {
        return $this->status === 'joined';
    }
}
