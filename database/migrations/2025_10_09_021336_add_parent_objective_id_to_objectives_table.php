<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddParentObjectiveIdToObjectivesTable extends Migration
{
    public function up()
    {
        Schema::table('objectives', function (Blueprint $table) {
            $table->unsignedBigInteger('parent_objective_id')->nullable()->after('objective_id');
            $table->foreign('parent_objective_id')->references('objective_id')->on('objectives')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::table('objectives', function (Blueprint $table) {
            $table->dropForeign(['parent_objective_id']);
            $table->dropColumn('parent_objective_id');
        });
    }
}