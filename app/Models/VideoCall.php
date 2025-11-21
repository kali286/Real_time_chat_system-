<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VideoCall extends Model
{
    protected $fillable = [
        'call_type',
        'conversation_id',
        'group_id',
        'initiated_by',
        'channel_name',
        'status',
        'started_at',
        'ended_at',
        'duration',
        'is_video',
        'is_recording',
        'recording_url',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'is_video' => 'boolean',
        'is_recording' => 'boolean',
        'duration' => 'integer',
    ];

    /**
     * Get the user who initiated the call
     */
    public function initiator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiated_by');
    }

    /**
     * Get the conversation (for 1-on-1 calls)
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    /**
     * Get the group (for group calls)
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    /**
     * Get all participants in the call
     */
    public function participants(): HasMany
    {
        return $this->hasMany(CallParticipant::class, 'call_id');
    }

    /**
     * Check if call is ongoing
     */
    public function isOngoing(): bool
    {
        return $this->status === 'ongoing';
    }

    /**
     * Check if call has ended
     */
    public function hasEnded(): bool
    {
        return in_array($this->status, ['ended', 'missed', 'rejected', 'cancelled']);
    }
}
