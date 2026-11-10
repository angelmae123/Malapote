
<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Model: FarmActModel
 * Handles farm activity records and planting relationships.
 */
class FarmActModel extends Model
{
    protected $table = 'farm_act';
    protected $primary_key = 'id';

    protected $fillable = [
        'record_code',
        'farm_planting_harvesting_id',
        'season',
        'area',
        'activity',
        'type_of_seedling',
        'fertilizers',
        'antipesticide',
        'date',
        'notes',
    ];

    protected $guarded = ['id'];

    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Get all activities with their associated planting information.
     * LEFT JOIN preserves old activities without a planting reference.
     */
    public function get_all_with_planting()
    {
        return $this->db->raw(
            'SELECT
                fa.*,
                ph.record_code AS planting_record_code,
                ph.field_name,
                ph.rice_variety,
                ph.season AS planting_season,
                ph.area_hectares,
                ph.status AS planting_status
             FROM farm_act fa
             LEFT JOIN farm_planting_harvesting ph
                ON ph.id = fa.farm_planting_harvesting_id
             ORDER BY fa.id DESC'
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    public function get_by_planting($planting_id)
    {
        return $this->db->raw(
            'SELECT *
             FROM farm_act
             WHERE farm_planting_harvesting_id = ?
             ORDER BY date DESC, id DESC',
            [$planting_id]
        )->fetchAll(PDO::FETCH_ASSOC);
    }
}
