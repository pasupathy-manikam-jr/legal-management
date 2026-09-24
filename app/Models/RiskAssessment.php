<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RiskAssessment extends Model
{
    use HasFactory;

    /** Where a risk stands in the register, from spotted to shut. */
    public const STATUSES = ['identified', 'assessed', 'monitored', 'mitigated', 'closed'];

    /**
     * The 5x5 matrix banded by score, as inclusive floors.
     *
     * @var array<string, int>
     */
    public const BANDS = ['critical' => 20, 'high' => 10, 'medium' => 5, 'low' => 1];

    protected $fillable = [
        'owner_id', 'matter_id', 'title', 'category', 'likelihood',
        'impact', 'identified_on', 'status', 'mitigation', 'review_on',
    ];

    protected $casts = ['review_on' => 'date', 'identified_on' => 'date'];

    /** Standard 5x5 risk matrix: 1-25. */
    public function score(): int
    {
        return $this->likelihood * $this->impact;
    }

    public function band(): string
    {
        foreach (self::BANDS as $band => $floor) {
            if ($this->score() >= $floor) {
                return $band;
            }
        }

        return 'low';
    }

    /** The score range a band covers, for filtering in SQL. */
    public static function range(string $band): array
    {
        $floors = array_values(self::BANDS);
        $index = array_search(self::BANDS[$band], $floors, true);

        return [self::BANDS[$band], $index === 0 ? 25 : $floors[$index - 1] - 1];
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function matter()
    {
        return $this->belongsTo(Matter::class);
    }
}
