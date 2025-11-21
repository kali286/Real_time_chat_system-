<?php

namespace App\Http\Controllers;

use App\Events\SocketMessage;
use App\Http\Requests\StoreMessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Group;
use App\Models\Message;
use App\Models\MessageAttachment;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function byUser(User $user) {
    // messages between the current user and $user (both directions)
        $messages = Message::with(['sender', 'attachments', 'reads'])->where(function($q) use ($user) {
               $q->where('sender_id', auth()->id())
                 ->where('receiver_id', $user->id);
           })->orWhere(function($q) use ($user) {
               $q->where('sender_id', $user->id)
                 ->where('receiver_id', auth()->id());
           })->latest()->paginate(10);

    // Mark messages addressed to current user from this peer as read
    try {
        $currentId = auth()->id();
        $toMark = Message::where('sender_id', $user->id)
            ->where('receiver_id', $currentId)
            ->whereNotIn('id', function($query) use ($currentId) {
                $query->select('message_id')->from('message_reads')->where('user_id', $currentId);
            })->pluck('id');

        foreach ($toMark as $msgId) {
            \App\Models\MessageRead::create([
                'message_id' => $msgId,
                'user_id' => $currentId,
                'read_at' => now(),
            ]);
        }
    } catch (\Exception $e) {
        // don't break loading messages if marking fails
        Log::warning('Failed to mark messages as read: ' . $e->getMessage());
    }

    return inertia('Home', [
        'selectedConversation' => $user->toConversationArrayFor(auth()->user()),
        'messages' => MessageResource::collection($messages)
    ]);
  }  

    public function byGroup(Group $group) {
    $messages = Message::with(['sender', 'attachments', 'reads'])->where('group_id', $group->id) 
    ->latest()
    ->paginate(20);
       // Mark group messages as read for current user
       try {
           $currentId = auth()->id();
           $toMark = Message::where('group_id', $group->id)
               ->where('sender_id', '!=', $currentId)
               ->whereNotIn('id', function($query) use ($currentId) {
                   $query->select('message_id')->from('message_reads')->where('user_id', $currentId);
               })->pluck('id');

           foreach ($toMark as $msgId) {
               \App\Models\MessageRead::create([
                   'message_id' => $msgId,
                   'user_id' => $currentId,
                   'read_at' => now(),
               ]);
           }
       } catch (\Exception $e) {
           Log::warning('Failed to mark group messages as read: ' . $e->getMessage());
       }

       return inertia('Home', [
            'selectedConversation' => $group->toConversationArrayFor(auth()->user()),
            'messages' => MessageResource::collection($messages)
       ]);
  }  

  public function loadOlder(Message $message) {
     
    //Load older meassage  that are older than the given message, sort by the latest

                if ($message->group_id){
                $messages = Message::with(['sender', 'attachments', 'reads'])
                        ->where('created_at', '<', $message->created_at)
                        ->where('group_id', $message->group_id)
                        ->latest()
                        ->paginate(10);
                                    }  
                                else {
                                        $messages = Message::with(['sender', 'attachments', 'reads'])
                                                ->where('created_at', '<', $message->created_at)
                                                ->where(function ($query) use ($message) {
                                                    $query->where('sender_id', $message->sender_id)
                                                 ->where('receiver_id', $message->receiver_id)
                                                 ->orwhere('sender_id', $message->receiver_id)
                                                 ->where('receiver_id', $message->sender_id);
                                                }) 
                                                ->latest()
                                                ->paginate(10);
                                    }
            return MessageResource::collection($messages);
  }  
  
      /**
       * Store a newly created resources in storage
       */
    public function store(StoreMessageRequest $request) {
      $data = $request->validated();
      $data['sender_id'] = Auth::id(); 
      
      // Log the incoming request data for debugging
      Log::info('Message store request:', [
          'data' => $data,
          'user' => Auth::id()
      ]);
      
      try {
          Log::debug('Creating message with data:', ['data' => $data]);
          $message = Message::create($data);
          
          $files = $data['attachments'] ?? [];
          $attachments = [];
          
          Log::debug('Message created successfully:', ['message_id' => $message->id]);
          
          if ($files) {
              foreach ($files as $file) {
                  $directory = 'attachments/' . Str::random(32);
                  Storage::makeDirectory($directory);
                  
                  $model = [
                      'message_id' => $message->id,
                      'name' => $file->getClientOriginalName(),
                      'mime' => $file->getClientMimeType(),
                      'size' => $file->getSize(),
                      'path' => $file->store($directory, 'public'),
                  ];
                  $attachment = MessageAttachment::create($model);
                  $attachments[] = $attachment;
              }
              $message->attachments = $attachments;
          }

          // Update conversations based on message type
          if ($message->group_id) {
              Group::updateGroupWithMessage($message->group_id, $message);
          } else if ($message->receiver_id) {
              $user = Auth::user();
              if (!$user) {
                  throw new \Exception('User not authenticated');
              }
              Conversation::updateConversationWithMessage($message->receiver_id, $user->id, $message);
          }

          // Try to dispatch the socket event, but don't fail if it doesn't work
          try {
              $tempId = $request->input('temp_id');
              SocketMessage::dispatch($message, $tempId);
          } catch (\Exception $e) {
              Log::warning('Failed to dispatch socket message:', [
                  'error' => $e->getMessage(),
                  'message_id' => $message->id
              ]);
          }
          
          // Return the message resource with fresh relations
          return new MessageResource($message->fresh(['sender', 'attachments', 'reads']));
      } catch (\Exception $e) {
          Log::error('Failed to store message:', [
              'error' => $e->getMessage(),
              'data' => $data
          ]);
          return response()->json(['message' => 'Failed to store message'], 500);
      }
    }

  /**
       *Remove the specific resource from storage
       */
   public function destroy(Message $message) {
      try {
          // Check if the user is authenticated
          $user = Auth::user();
          if (!$user) {
              return response()->json(['message' => 'Unauthorized'], 401);
          }

          // Check if the user is part of the conversation
          $canDelete = false;
          
          // For group messages: user must be a member of the group
          if ($message->group_id) {
              $canDelete = $user->groups()->where('groups.id', $message->group_id)->exists();
          } 
          // For private messages: user must be sender or receiver
          else {
              $canDelete = ($message->sender_id === $user->id || $message->receiver_id === $user->id);
          }

          if (!$canDelete) {
              return response()->json(['message' => 'You are not authorized to delete this message'], 403);
          }

          // Store message details before deletion
          $groupId = $message->group_id;
          $senderId = $message->sender_id;
          $receiverId = $message->receiver_id;
          $messageId = $message->id;
          
          //check if the message is a group message
          if ($groupId) {
              // Update group if this was the last message
              $group = Group::where('last_message_id', $messageId)->first();
              if ($group) {
                  $prevMessage = Message::where('group_id', $groupId)
                      ->where('id', '!=', $messageId)
                      ->latest()
                      ->first();

                  $group->last_message_id = $prevMessage ? $prevMessage->id : null;
                  $group->save();
              } 
          } else {
              // For private messages, update conversation if this was the last message
              $conversation = Conversation::where('last_message_id', $messageId)
                  ->where(function($q) use ($senderId, $receiverId) {
                      $q->where(function($query) use ($senderId, $receiverId) {
                          $query->where('user_id1', $senderId)
                                ->where('user_id2', $receiverId);
                      })->orWhere(function($query) use ($senderId, $receiverId) {
                          $query->where('user_id1', $receiverId)
                                ->where('user_id2', $senderId);
                      });
                  })->first();

              if ($conversation) {
                  $prevMessage = Message::where('id', '!=', $messageId)
                      ->where(function($q) use ($senderId, $receiverId) {
                          $q->where(function($query) use ($senderId, $receiverId) {
                              $query->where('sender_id', $senderId)
                                    ->where('receiver_id', $receiverId);
                          })->orWhere(function($query) use ($senderId, $receiverId) {
                              $query->where('sender_id', $receiverId)
                                    ->where('receiver_id', $senderId);
                          });
                      })
                      ->latest()
                      ->first();

                  $conversation->last_message_id = $prevMessage ? $prevMessage->id : null;
                  $conversation->save();
              }
          }

          // Delete the message
          $message->delete();

          return response()->json(['success' => true, 'message' => 'Message deleted successfully']);
          
      } catch (\Exception $e) {
          Log::error('Error deleting message: ' . $e->getMessage(), [
              'message_id' => $message->id ?? null,
              'trace' => $e->getTraceAsString()
          ]);
          return response()->json(['message' => 'Failed to delete message: ' . $e->getMessage()], 500);
      }
  }
  
  public function forward(Request $request)
  {
      try {
          $request->validate([
              'message_id' => 'required|exists:messages,id',
              'conversation_ids' => 'required|array|min:1',
              'conversation_ids.*' => 'required|integer',
          ]);

          $user = Auth::user();
          $originalMessage = Message::with('attachments')->findOrFail($request->message_id);

          // Verify user has access to the original message
          if ($originalMessage->group_id) {
              if (!$user->groups()->where('groups.id', $originalMessage->group_id)->exists()) {
                  return response()->json(['message' => 'Unauthorized'], 403);
              }
          } else {
              if ($originalMessage->sender_id !== $user->id && $originalMessage->receiver_id !== $user->id) {
                  return response()->json(['message' => 'Unauthorized'], 403);
              }
          }

          $forwardedCount = 0;

          foreach ($request->conversation_ids as $conversationId) {
              // Determine if it's a group or user conversation
              $group = Group::find($conversationId);
              $targetUser = null;

              if ($group) {
                  // Verify user is member of target group
                  if (!$user->groups()->where('groups.id', $group->id)->exists()) {
                      continue;
                  }
              } else {
                  $targetUser = User::find($conversationId);
                  if (!$targetUser) {
                      continue;
                  }
              }

              // Create forwarded message
              $forwardedMessage = new Message();
              $forwardedMessage->message = $originalMessage->message;
              $forwardedMessage->sender_id = $user->id;
              
              if ($group) {
                  $forwardedMessage->group_id = $group->id;
              } else {
                  $forwardedMessage->receiver_id = $targetUser->id;
              }

              $forwardedMessage->save();

              // Copy attachments if any
              if ($originalMessage->attachments->count() > 0) {
                  foreach ($originalMessage->attachments as $attachment) {
                      $forwardedMessage->attachments()->create([
                          'name' => $attachment->name,
                          'path' => $attachment->path,
                          'mime' => $attachment->mime,
                          'size' => $attachment->size,
                      ]);
                  }
              }

              // Update last message for group or conversation
              if ($group) {
                  $group->last_message_id = $forwardedMessage->id;
                  $group->save();
              } else {
                  Conversation::updateConversationWithMessage($targetUser->id, $user->id, $forwardedMessage);
              }

              // Broadcast the message
              try {
                  $forwardedMessage->load(['sender', 'attachments']);
                  SocketMessage::dispatch($forwardedMessage);
              } catch (\Exception $e) {
                  Log::warning('Failed to dispatch forwarded message:', [
                      'error' => $e->getMessage(),
                      'message_id' => $forwardedMessage->id
                  ]);
              }

              $forwardedCount++;
          }

          return response()->json([
              'success' => true,
              'message' => "Message forwarded to {$forwardedCount} conversation(s)",
          ]);
      } catch (\Exception $e) {
          Log::error('Error forwarding message: ' . $e->getMessage(), [
              'message_id' => $request->message_id ?? null,
              'trace' => $e->getTraceAsString()
          ]);
          return response()->json([
              'message' => 'Failed to forward message: ' . $e->getMessage()
          ], 500);
      }
  }

  public function report(Request $request)
  {
      $request->validate([
          'message_id' => 'required|exists:messages,id',
          'reason' => 'required|string|in:spam,harassment,violence,nudity,privacy,scam,other',
          'additional_info' => 'nullable|string|max:1000',
      ]);

      $user = Auth::user();
      $message = Message::findOrFail($request->message_id);

      // Prevent reporting own messages
      if ($message->sender_id === $user->id) {
          return response()->json(['message' => 'You cannot report your own message'], 422);
      }

      // Check if already reported by this user
      $existingReport = DB::table('reported_messages')
          ->where('message_id', $message->id)
          ->where('reported_by', $user->id)
          ->first();

      if ($existingReport) {
          return response()->json(['message' => 'You have already reported this message'], 422);
      }

      // Create report
      DB::table('reported_messages')->insert([
          'message_id' => $message->id,
          'reported_by' => $user->id,
          'reason' => $request->reason,
          'additional_info' => $request->additional_info,
          'status' => 'pending',
          'created_at' => now(),
          'updated_at' => now(),
      ]);

      // Notify admins (you can implement email notification here)
      $admins = User::where('is_admin', true)->get();
      foreach ($admins as $admin) {
          // Send notification to admin
          // You can use Laravel notifications here
      }

      return response()->json([
          'success' => true,
          'message' => 'Message reported successfully. Our team will review it.',
      ]);
  }

  public function getConversations()
  {
      $user = Auth::user();

      // Get all groups the user is a member of
      $groups = $user->groups()
          ->with(['users'])
          ->get()
          ->map(function ($group) {
              return [
                  'id' => $group->id,
                  'name' => $group->name,
                  'is_group' => true,
                  'users' => $group->users,
              ];
          });

      // Get all users the current user has conversations with
      $conversations = Conversation::where(function ($query) use ($user) {
          $query->where('user_id1', $user->id)
                ->orWhere('user_id2', $user->id);
      })
      ->with(['user1', 'user2'])
      ->get()
      ->map(function ($conversation) use ($user) {
          $otherUser = $conversation->user_id1 === $user->id 
              ? $conversation->user2 
              : $conversation->user1;

          return [
              'id' => $otherUser->id,
              'name' => $otherUser->name,
              'is_group' => false,
              'user' => $otherUser,
          ];
      });

      // Merge both
      $allConversations = $groups->concat($conversations)->values();

      return response()->json($allConversations);
  }
  
}
