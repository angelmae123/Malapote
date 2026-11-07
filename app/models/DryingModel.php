<?php

defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class DryingModel extends Model
{
    protected $table = 'drying_records';
    protected $primary_key = 'id';

    protected $fillable = [
        'drying_id',
        'palay_purchasing_id',
        'batch_code',
        'start_date',
        'end_date',
        'start_weight_kg',
        'final_weight_kg',
        'drying_cost',
        'status',
    ];

    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }
}
