<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Model: PayrollModels
 * Handles individual farmer and worker payroll records.
 */
class PayrollModels extends Model
{
    protected $table = 'payroll';
    protected $primary_key = 'id';

    protected $fillable = [
        'payroll_period_id',
        'payroll_id',
        'farmers_workers_id',
        'worker_name',
        'employment_type',
        'rate',
        'days',
        'gross',
        'advance',
        'net',
        'status',
    ];

    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }
}
