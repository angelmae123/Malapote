<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Model: FInventoryModel
 * Handles farm supplies, materials, and equipment inventory.
 */
class FInventoryModel extends Model
{
    protected $table = 'farm_inventory';
    protected $primary_key = 'id';

    protected $fillable = [
        'record_code',
        'season_id',
        'farm_act_id',
        'item_category',
        'item_name',
        'quantity',
        'unit',
        'unit_price',
        'total_cost',
        'date_acquired',
    ];

    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Get inventory with its season name.
     */
    public function get_all_with_season()
    {
        return $this->db->raw(
            'SELECT
                fi.*,
                s.season_name
             FROM farm_inventory fi
             LEFT JOIN seasons s
                ON s.season_id = fi.season_id
             ORDER BY fi.id DESC'
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get inventory items by category.
     */
    public function get_by_category($category)
    {
        return $this->db->raw(
            'SELECT *
             FROM farm_inventory
             WHERE item_category = ?
             ORDER BY item_name ASC',
            [$category]
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get available inventory items for input applications.
     * Only items with a valid unit and positive stock are returned.
     */
    public function get_available_input_inventory()
    {
        return $this->db->raw(
            "SELECT
                id,
                record_code,
                item_category,
                item_name,
                quantity,
                unit
             FROM farm_inventory
             WHERE quantity > 0
               AND unit IS NOT NULL
               AND TRIM(unit) <> ''
             ORDER BY item_name ASC"
        )->fetchAll(PDO::FETCH_ASSOC);
    }
}
