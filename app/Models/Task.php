<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Task extends Model
{
    use HasFactory;

    protected $fillable = ['matter_id', 'assigned_to', 'title', 'notes', 'status', 'type', 'priority', 'due_on', 'completed_at'];

    /** The kanban columns, in board order, with the colour each column is tinted with. */
    public const STATUSES = [
        'not_started' => ['label' => 'Not Started', 'color' => '#6b7280'],
        'in_progress' => ['label' => 'In Progress', 'color' => '#3b82f6'],
        'under_review' => ['label' => 'Under Review', 'color' => '#f59e0b'],
        'on_hold' => ['label' => 'On Hold', 'color' => '#ef4444'],
        'completed' => ['label' => 'Completed', 'color' => '#10b981'],
        'cancelled' => ['label' => 'Cancelled', 'color' => '#dc2626'],
        'deferred' => ['label' => 'Deferred', 'color' => '#f97316'],
        'blocked' => ['label' => 'Blocked', 'color' => '#ec4899'],
        'archived' => ['label' => 'Archived', 'color' => '#6b7280'],
    ];

    /** Highest urgency first, which is also the order the filter tabs use. */
    /**
     * The board's columns. Firm Setup owns this list; the constant is the
     * default it is seeded from, and the fallback when nothing is set up.
     *
     * @return array<string, array{label: string, color: string}>
     */
    public static function statuses(): array
    {
        $configured = Taxonomy::kind('task_status')->get();

        if ($configured->isEmpty()) {
            return self::STATUSES;
        }

        return $configured
            ->mapWithKeys(fn (Taxonomy $status) => [
                Str::snake($status->name) => ['label' => $status->name, 'color' => $status->color ?? '#6b7280'],
            ])
            ->all();
    }

    public const PRIORITIES = ['critical', 'high', 'medium', 'low'];

    protected $casts = [
        'due_on' => 'date',
        'completed_at' => 'datetime',
    ];

    /** The status owns whether a task is done; completed_at just records when. */
    protected static function booted(): void
    {
        static::saving(function (self $task) {
            if ($task->isDirty('status')) {
                $task->completed_at = $task->status === 'completed' ? ($task->completed_at ?? now()) : null;
            }
        });
    }

    public function matter()
    {
        return $this->belongsTo(Matter::class);
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
