<?php

defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class MillingModel extends Model
{
    protected $table = 'milling_records';
    protected $primary_key = 'id';

    protected $fillable = [
        'milling_id',
        'drying_record_id',
        'palay_purchasing_id',
        'batch_code',
        'milling_date',
        'dried_input_kg',

        // Actual rice packaging output
        'sacks_50kg',
        'sacks_25kg',
        'loose_rice_kg',

        // Computed rice output and by-products
        'rice_output_kg',
        'bran_kg',
        'broken_rice_kg',
        'recovery_rate',
        'status',
    ];

    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }
}
