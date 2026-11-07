<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Model: FInventoryModel
 * 
 * Automatically generated via CLI.
 */
class FInventoryModel extends Model {
    protected $table = 'farm_inventory';
    protected $primary_key = 'id';
    protected $fillable = [
        'season_id',
        'farm_act_id',
        'item_category',
        'item_name',
        'quantity',
        'unit',
        'unit_price',
        'total_cost',
        'date_acquired',
    ];
    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }
}