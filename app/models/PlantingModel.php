<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Model: PlantingModel
 *
 * Handles planting cycles and harvest records
 * for AgriStock and future ML Harvest Prediction.
 */
class PlantingModel extends Model
{
    protected $table = 'farm_planting_harvesting';
    protected $primary_key = 'id';

    protected $fillable = [
        'record_code',
        'season',
        'field_name',
        'area_hectares',
        'crop',
        'rice_variety',
        'method',
        'planting_date',
        'expected_harvest_date',
        'actual_harvest_date',
        'harvested_yield',
        'status',
    ];

    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }
}
