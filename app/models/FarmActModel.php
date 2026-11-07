<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Model: FarmActModel
 * 
 * Automatically generated via CLI.
 */
class FarmActModel extends Model {
    protected $table = 'farm_act';
    protected $primary_key = 'id';
    protected $fillable = [
        'farm_planting_harvesting_id',
        'season',
        'area',
        'activity',
        'type_of_seedling',
        'fertilizers',
        'antipesticide',
        'date',
    ];
    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }
}