
<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class ShippingRateModel extends Model
{
    protected $table = 'shipping_rate';
    protected $primary_key = 'id';

    protected $fillable = [
        'municipality',
        'barangay',
        'min_sacks',
        'max_sacks',
        'shipping_fee',
        'status',
    ];

    protected $guarded = ['id'];

    protected $timestamps = true;
    protected $created_at_column = 'created_at';
    protected $updated_at_column = 'updated_at';
}
