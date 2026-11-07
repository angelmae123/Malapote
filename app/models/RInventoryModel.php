<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class RInventoryModel extends Model
{
    protected $table = 'mill_inventory';
    protected $primary_key = 'id';

    protected $fillable = [
        'milling_records_id',
        'item_name',
        'variety',
        'category',
        'stock_quantity',
        'sack_quantity',
        'sack_weight_kg',
        'source_quantity',
        'source_key',
    ];

    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }
}