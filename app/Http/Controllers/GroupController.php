<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreGroupRequest;
use App\Http\Requests\UpdateGroupRequest;
use App\Jobs\DeleteGroupJob;
use App\Models\Group;

class GroupController extends Controller
{
   

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreGroupRequest $request)
    {
        $data = $request->validated();
        $user_ids = $data['user_ids'] ?? [];
        $group = Group::create($data);
        $group->users()->attach(array_unique([$request->user()->id, ...$user_ids]));
        return redirect()->back();
    }


    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateGroupRequest $request, Group $group)
    {
        $data = $request->validated();
        $user_ids = $data['user_ids'] ?? [];
        $group->update($data);
       
        //Remove all users and attach the new ones
        $group->users()->detach();
        $group->users()->attach(array_unique([$request->user()->id, ...$user_ids]));
        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Group $group)
    {
        //check if the user is the owner of the group
        if ($group->owner_id != auth()->user()->id) {
            abort(403);
        }
                // Perform deletion synchronously (previously this was scheduled via job).
                $id = $group->id;
                $name = $group->name;

                // clear last message pointer
                $group->last_message_id = null;
                $group->save();

                // delete messages
                $group->messages->each->delete();

                // detach users
                $group->users()->detach();

                // delete group model
                $group->delete();

                // dispatch GroupDeleted event so frontends/listeners can update
                event(new \App\Events\GroupDeleted($id, $name));

                return response()->json(['message' => 'Group deleted successfully']);
    }
}
