<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Model: SalesModel
 * 
 * Automatically generated via CLI.
 */
class SalesModel extends Model {
    protected $table = 'sales';
    protected $primary_key = 'id';
    protected $fillable = [
        'transaction_code',
        'orders_id',
        'mill_inventory_id',
        'customer_name',
        'product_name',
        'payment_method',
        'sale_date',
        'amount',
        'status',
    ];
    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }
}