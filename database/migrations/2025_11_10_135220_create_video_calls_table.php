<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('video_calls', function (Blueprint $table) {
            $table->id();
            $table->enum('call_type', ['one_to_one', 'group'])->default('one_to_one');
            $table->foreignId('conversation_id')->nullable()->constrained('conversations')->onDelete('cascade');
            $table->foreignId('group_id')->nullable()->constrained('groups')->onDelete('cascade');
            $table->foreignId('initiated_by')->constrained('users')->onDelete('cascade');
            $table->string('channel_name')->unique();
            $table->enum('status', ['ringing', 'ongoing', 'ended', 'missed', 'rejected', 'cancelled'])->default('ringing');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->integer('duration')->default(0)->comment('Duration in seconds');
            $table->boolean('is_video')->default(true)->comment('true=video call, false=audio only');
            $table->boolean('is_recording')->default(false);
            $table->string('recording_url')->nullable();
            $table->timestamps();
            
            $table->index('status');
            $table->index('initiated_by');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('video_calls');
    }
};
