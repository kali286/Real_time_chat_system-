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
        Schema::table('statuses', function (Blueprint $table) {
            $table->unsignedInteger('music_start_seconds')->nullable()->after('music_path');
            $table->unsignedInteger('music_duration_seconds')->nullable()->after('music_start_seconds');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('statuses', function (Blueprint $table) {
            $table->dropColumn(['music_start_seconds', 'music_duration_seconds']);
        });
    }
};
