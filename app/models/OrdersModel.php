<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class OrdersModel extends Model
{
    protected $table = 'orders';
    protected $primary_key = 'id';

    protected $fillable = [
        'order_code',
        'mill_inventory_id',
        'customer_name',
        'contact_number',
        'email',
        'delivery_address',
        'municipality',
        'barangay',
        'order_notes',
        'items_ordered',
        'payment_method',
        'payment_status',
        'order_date',
        'shipping_fee',
        'total_amount',
        'status',
    ];

    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }
}