<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class ReportsModel extends Model
{
    protected $table = 'weekly_reports';
    protected $primary_key = 'id';

    protected $fillable = [
        'week_range',
        'start_date',
        'end_date',
        'total_sales',
        'total_production',
        'generated_date',
    ];

    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }
}