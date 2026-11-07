<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Model: FarmersModel
 * 
 * Automatically generated via CLI.
 */
class FarmersModel extends Model {
    protected $table = 'farmers_workers';
    protected $primary_key = 'id';
    protected $fillable = [
        'name',
        'role',
        'contact_no',
        'days_of_work',
        'season',
    ];
    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }
}