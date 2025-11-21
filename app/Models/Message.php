<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\ObservedBy;
use App\Observers\MessageObserver;

#[ObservedBy(MessageObserver::class)]

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
       'message',
       'sender_id',
       'group_id',
       'receiver_id',
       'reply_to_id',
    ];

    public function sender(){
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function group(){
        return $this->belongsTo(Group::class);
    }

    public function receiver(){
        return $this->belongsTo(User::class, 'receiver_id');
    }

    public function attachments(){
        return $this->hasMany(MessageAttachment::class);
    }

    public function reads()
    {
        return $this->hasMany(MessageRead::class);
    }

    public function replyTo(){
        return $this->belongsTo(Message::class, 'reply_to_id');
    }
}
