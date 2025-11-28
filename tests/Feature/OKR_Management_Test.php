<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;
use App\Models\Objective;
use App\Models\KeyResult;
use App\Models\Cycle;
use App\Models\Department;

class OKR_Management_Test extends TestCase
{
    use RefreshDatabase;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->actingAs($this->user);
    }

    public function test_user_can_create_objective()
    {
        $cycle = Cycle::factory()->create();
        $department = Department::factory()->create();

        $objectiveData = [
            'title' => 'Test Objective',
            'description' => 'Test Objective Description',
            'cycle_id' => $cycle->id,
            'department_id' => $department->id,
            'level' => 'personal',
        ];

        $response = $this->post(route('my-objectives.store'), $objectiveData);

        $response->assertStatus(302);
        $this->assertDatabaseHas('objectives', ['title' => 'Test Objective']);
    }

    public function test_user_can_create_key_result()
    {
        $objective = Objective::factory()->create(['user_id' => $this->user->id]);

        $keyResultData = [
            'title' => 'Test Key Result',
            'description' => 'Test Key Result Description',
            'objective_id' => $objective->id,
            'initial_value' => 0,
            'target_value' => 100,
            'current_value' => 0,
            'weight' => 50,
        ];

        $response = $this->post(route('my-key-results.store'), $keyResultData);

        $response->assertStatus(302);
        $this->assertDatabaseHas('key_results', ['title' => 'Test Key Result']);
    }

    public function test_user_can_check_in_key_result()
    {
        $objective = Objective::factory()->create(['user_id' => $this->user->id]);
        $keyResult = KeyResult::factory()->create(['objective_id' => $objective->id]);

        $checkInData = [
            'value' => 50,
            'comment' => 'Halfway there!',
        ];

        $response = $this->post(route('check-in.store', ['objectiveId' => $objective->id, 'krId' => $keyResult->id]), $checkInData);

        $response->assertStatus(302);
        $this->assertDatabaseHas('check_ins', [
            'key_result_id' => $keyResult->id,
            'value' => 50,
        ]);
        $this->assertDatabaseHas('key_results', [
            'id' => $keyResult->id,
            'current_value' => 50,
        ]);
    }

    public function test_user_can_update_objective()
    {
        $objective = Objective::factory()->create(['user_id' => $this->user->id]);

        $updatedData = [
            'title' => 'Updated Objective Title',
            'description' => 'Updated Objective Description',
        ];

        $response = $this->put(route('my-objectives.update', $objective->id), $updatedData);

        $response->assertStatus(302);
        $this->assertDatabaseHas('objectives', [
            'id' => $objective->id,
            'title' => 'Updated Objective Title',
        ]);
    }

    public function test_user_can_update_key_result()
    {
        $objective = Objective::factory()->create(['user_id' => $this->user->id]);
        $keyResult = KeyResult::factory()->create(['objective_id' => $objective->id]);

        $updatedData = [
            'title' => 'Updated Key Result Title',
            'target_value' => 200,
        ];

        $response = $this->put(route('my-key-results.update', ['objectiveId' => $objective->id, 'keyResultId' => $keyResult->id]), $updatedData);

        $response->assertStatus(302);
        $this->assertDatabaseHas('key_results', [
            'id' => $keyResult->id,
            'title' => 'Updated Key Result Title',
            'target_value' => 200,
        ]);
    }

    public function test_user_can_archive_and_unarchive_objective()
    {
        $objective = Objective::factory()->create(['user_id' => $this->user->id]);

        $this->post(route('my-objectives.archive', $objective->id))->assertStatus(302);
        $this->assertSoftDeleted('objectives', ['id' => $objective->id]);

        $this->post(route('my-objectives.unarchive', $objective->id))->assertStatus(302);
        $this->assertNotSoftDeleted('objectives', ['id' => $objective->id]);
    }

    public function test_user_can_delete_key_result()
    {
        $objective = Objective::factory()->create(['user_id' => $this->user->id]);
        $keyResult = KeyResult::factory()->create(['objective_id' => $objective->id]);

        $this->delete(route('my-key-results.destroy', ['objectiveId' => $objective->id, 'keyResultId' => $keyResult->id]))->assertStatus(302);
        $this->assertDatabaseMissing('key_results', ['id' => $keyResult->id]);
    }

    public function test_user_can_delete_objective()
    {
        $objective = Objective::factory()->create(['user_id' => $this->user->id]);

        $this->delete(route('my-objectives.destroy', $objective->id))->assertStatus(302);
        $this->assertDatabaseMissing('objectives', ['id' => $objective->id]);
    }
}
