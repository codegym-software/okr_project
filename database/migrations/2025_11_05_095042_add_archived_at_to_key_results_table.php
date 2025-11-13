<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

public function up()
{
    Schema::table('key_results', function (Blueprint $table) {
        $table->timestamp('archived_at')->nullable()->after('progress_percent');
    });
}
public function down()
{
    Schema::table('key_results', function (Blueprint $table) {
        $table->dropColumn('archived_at');
    });
}
};
