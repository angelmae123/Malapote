<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Model: PayrollPeriodModel
 * Handles monthly payroll periods.
 */
class PayrollPeriodModel extends Model
{
    protected $table = 'payroll_periods';
    protected $primary_key = 'id';

    protected $fillable = [
        'period_month',
        'period_year',
        'payroll_date',
        'status',
    ];

    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }
}
