<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Mail\UserCreated;
use App\Mail\UserRoleChanged;
use App\Mail\UserBlockedUnblocked;
use App\Models\Conversation;
use App\Models\Group;
use App\Models\MessageRead;

class UserController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255','unique:users,email'],
            'is_admin' => 'required|boolean',
        ]);

        //Generate and assign a random password
        $rawPassword = Str::random(8);
        $data['password'] = bcrypt($rawPassword);
        $data['email_verified_at'] = now();

        $user = User::create($data);

        //send mail
        Mail::to($user)->send(new UserCreated($user, $rawPassword));

        return redirect()->back();
    }

    public function changeRole(User $user)
    {
       $user->update(['is_admin' => !(bool) $user->is_admin]);
       
       $message = "Role changed successfully to " . ($user->is_admin ? "Admin" : "Regular User");
       
       //send mail
       Mail::to($user)->send(new UserRoleChanged($user));

       return response()->json(['message' => $message]);
    }

    public function blockUnblock(User $user)
    {
       if($user->blocked_at){
           $user->blocked_at = null;
           $message = 'User "'. $user->name . '" has been activated';
       }else{
           $user->blocked_at = now();
           $message = 'User "'. $user->name . '" has been blocked';
       }
         $user->save();

         //send mail
         Mail::to($user)->send(new UserBlockedUnblocked($user));
         
         return response()->json(['message' => $message]);

    }

    /**
     * Remove the specified user from storage.
     */
    public function destroy(User $user)
    {
        // Prevent deleting self
        if (auth()->id() === $user->id) {
            return response()->json(['message' => 'You cannot delete yourself'], 403);
        }

        $name = $user->name;

        try {
            \DB::beginTransaction();

            // Gather message ids for any messages involving this user
            $messageIds = \App\Models\Message::where('sender_id', $user->id)
                ->orWhere('receiver_id', $user->id)
                ->pluck('id')
                ->toArray();

            if (!empty($messageIds)) {
                // Null out any conversations/groups that reference these messages as last_message
                Conversation::whereIn('last_message_id', $messageIds)->update(['last_message_id' => null]);
                Group::whereIn('last_message_id', $messageIds)->update(['last_message_id' => null]);

                // Delete reads and attachments tied to the messages
                MessageRead::whereIn('message_id', $messageIds)->delete();
                \DB::table('message_attachments')->whereIn('message_id', $messageIds)->delete();

                // Now safe to delete messages where user is sender or receiver
                \App\Models\Message::whereIn('id', $messageIds)->delete();
            }

            // Detach user from groups
            $user->groups()->detach();

            // Finally delete the user
            $user->delete();

            \DB::commit();

            return response()->json(['message' => 'User "' . $name . '" has been deleted']);
        } catch (\Exception $ex) {
            \DB::rollBack();
            \Log::error('Failed deleting user: '.$ex->getMessage());
            return response()->json(['message' => 'Failed to delete user'], 500);
        }
    }
}
