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
        Schema::create('call_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_id')->constrained('video_calls')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamp('joined_at')->nullable();
            $table->timestamp('left_at')->nullable();
            $table->integer('duration')->default(0)->comment('Duration in seconds');
            $table->enum('status', ['invited', 'ringing', 'joined', 'left', 'rejected'])->default('invited');
            $table->boolean('is_hand_raised')->default(false);
            $table->boolean('is_mic_muted')->default(false);
            $table->boolean('is_video_off')->default(false);
            $table->timestamps();
            
            $table->index(['call_id', 'user_id']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('call_participants');
    }
};
