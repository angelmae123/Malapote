
<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class SeasonsModel extends Model
{
    protected $table = 'seasons';
    protected $primary_key = 'season_id';

    protected $fillable = [
        'season_id',
        'season_name',
        'season_type',
        'start_date',
        'end_date',
        'status',
        'description',
        'created_at',
        'updated_at'
    ];

    protected $guarded = ['season_id'];

    public function __construct()
    {
        parent::__construct();
    }
}
