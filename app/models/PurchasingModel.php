
<?php

defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class PurchasingModel extends Model
{
    protected $table = 'palay_purchasing';
    protected $primary_key = 'id';

    protected $fillable = [
        'batch_code',
        'variety',
        'supplier_name',
        'purchase_date',
        'quantity_kg',
        'price_per_kg',
        'total_amount',
        'payment_status',
        'status',
    ];

    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }
}
