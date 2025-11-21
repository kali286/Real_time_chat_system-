<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;
use phpDocumentor\Reflection\Types\This;

class MessageAttachmentResource extends JsonResource
{
    public static $wrap = false; 

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    { 
        // grab or return message attachemnt

        return [
            'id' => $this->id,
            'message_id' => $this->message_id,
           'name' => $this->name,
           'url' => Storage::url($this->path),
           'mime' => $this-> mime,
           'size' => $this->size,
           'created_at' => $this->created_at,
           'updated_at' => $this->updated_at,
        ];
    }
}
