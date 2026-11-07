<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Model: ProductsModel
 * AgriStock - Sales Products
 */
class ProductsModel extends Model
{
    protected $table = 'products';
    protected $primary_key = 'id';

    protected $fillable = [
        'mill_inventory_id',
        'product_name',
        'category',
        'sack_size_kg',
        'price',
        'description',
        'image',
        'status',
    ];

    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }
}
