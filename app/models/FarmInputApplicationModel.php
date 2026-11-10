<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Model: FarmInputApplicationModel
 *
 * Handles fertilizer and pesticide applications
 * and their associated inventory records.
 */
class FarmInputApplicationModel extends Model
{
    protected $table = 'farm_input_application';
    protected $primary_key = 'id';

    protected $fillable = [
        'record_code',
        'farm_planting_harvesting_id',
        'farm_act_id',
        'farm_inventory_id',
        'input_category',
        'input_name',
        'quantity',
        'unit',
        'application_date',
        'notes',
    ];

    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Get all applications for a planting/harvesting cycle.
     */
    public function get_by_planting_harvesting($planting_harvesting_id)
    {
        return $this->db->raw(
            'SELECT
                fia.*,
                fi.record_code AS inventory_record_code,
                fi.item_name AS inventory_item_name
             FROM farm_input_application fia
             LEFT JOIN farm_inventory fi
                ON fi.id = fia.farm_inventory_id
             WHERE fia.farm_planting_harvesting_id = ?
             ORDER BY fia.application_date DESC, fia.id DESC',
            [$planting_harvesting_id]
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get fertilizer total in kilograms only.
     */
    public function get_total_by_category($planting_harvesting_id, $category)
    {
        $statement = $this->db->raw(
            'SELECT SUM(quantity) AS total_quantity
             FROM farm_input_application
             WHERE farm_planting_harvesting_id = ?
               AND input_category = ?
               AND unit = ?',
            [
                $planting_harvesting_id,
                strtoupper($category),
                'kg'
            ]
        );

        $result = $statement->fetch(PDO::FETCH_ASSOC);

        return (float) ($result['total_quantity'] ?? 0);
    }

    public function get_total_npk($planting_harvesting_id)
    {
        return $this->get_total_by_category(
            $planting_harvesting_id,
            'NPK'
        );
    }

    public function get_total_other($planting_harvesting_id)
    {
        return $this->get_total_by_category(
            $planting_harvesting_id,
            'OTHER'
        );
    }

    /**
     * Get pesticide totals grouped by unit.
     * Does not combine mL and L.
     */
    public function get_total_pesticide_by_unit($planting_harvesting_id)
    {
        $statement = $this->db->raw(
            'SELECT
                unit,
                SUM(quantity) AS total_quantity
             FROM farm_input_application
             WHERE farm_planting_harvesting_id = ?
               AND input_category = ?
             GROUP BY unit
             ORDER BY unit',
            [$planting_harvesting_id, 'PESTICIDE']
        );

        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function ($row) {
            return [
                'unit' => $row['unit'],
                'quantity' => (float) $row['total_quantity']
            ];
        }, $rows);
    }

    /**
     * Get all totals grouped by category and unit.
     */
    public function get_totals_by_category_and_unit($planting_harvesting_id)
    {
        $statement = $this->db->raw(
            'SELECT
                input_category,
                unit,
                SUM(quantity) AS total_quantity
             FROM farm_input_application
             WHERE farm_planting_harvesting_id = ?
             GROUP BY input_category, unit
             ORDER BY input_category, unit',
            [$planting_harvesting_id]
        );

        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);

        $totals = [
            'NPK' => [],
            'OTHER' => [],
            'PESTICIDE' => [],
        ];

        foreach ($rows as $row) {
            $category = strtoupper($row['input_category']);

            if (!isset($totals[$category])) {
                continue;
            }

            $totals[$category][] = [
                'unit' => $row['unit'],
                'quantity' => (float) $row['total_quantity']
            ];
        }

        return $totals;
    }

    /**
     * Get applications linked to a particular inventory item.
     */
    public function get_by_inventory($farm_inventory_id)
    {
        return $this->db->raw(
            'SELECT *
             FROM farm_input_application
             WHERE farm_inventory_id = ?
             ORDER BY application_date DESC, id DESC',
            [$farm_inventory_id]
        )->fetchAll(PDO::FETCH_ASSOC);
    }
}
