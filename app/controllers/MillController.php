<?php

defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class MillController extends Controller
{
    private $models = [];
    private $api;
    private $db;

    public function __construct()
    {
        parent::__construct();

        $this->db = $this->call->database();

        $this->models = [
            'purchasing' => $this->call->model('PurchasingModel'),
            'drying'     => $this->call->model('DryingModel'),
            'milling'    => $this->call->model('MillingModel'),
            'inventory'  => $this->call->model('RInventoryModel'),
        ];

        $this->api = $this->call->library('api');
    }

    /* =========================================================
       PURCHASING
    ========================================================= */

    public function purchasing()
    {
        $this->api->require_method('GET');
        $this->authorize_mill_access();

        $statement = $this->db->raw(
            "SELECT p.*,
                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM drying_records d
                        WHERE d.palay_purchasing_id = p.id
                    ) THEN 1
                    ELSE 0
                END AS has_drying
             FROM palay_purchasing p
             ORDER BY p.id DESC"
        );

        $this->api->respond(
            $statement->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    public function purchasing_record($id)
    {
        $this->api->require_method('GET');
        $this->authorize_mill_access();

        $this->api->respond(
            $this->find_record('purchasing', $id)
        );
    }

    public function add_purchasing()
    {
        $this->api->require_method('POST');
        $this->authorize_mill_access();

        $input = $this->api->body();

        $this->require_fields($input, ['batch_code', 'variety']);

        $data = $this->purchasing_data($input);

        $this->validate_unique_batch_code($data['batch_code']);

        $id = $this->models['purchasing']->_insert($data);

        $this->created_response($id, 'Palay purchase');
    }

    public function update_purchasing($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_mill_access();

        $current = $this->find_record('purchasing', $id);
        $input = $this->api->body();

        $this->require_fields($input, ['batch_code', 'variety']);

        $data = $this->purchasing_data($input, $current);

        $this->validate_unique_batch_code(
            $data['batch_code'],
            (int) $current['id']
        );

        $dryingStatement = $this->db->raw(
            "SELECT COUNT(*)
             FROM drying_records
             WHERE palay_purchasing_id = ?",
            [(int) $current['id']]
        );

        $hasDrying = (int) $dryingStatement->fetchColumn() > 0;

        if (
            $hasDrying &&
            $data['batch_code'] !== $current['batch_code']
        ) {
            $this->api->respond_error(
                'Batch code cannot be changed because this purchase already has a drying record.',
                422
            );
        }

        if (
            $hasDrying &&
            $data['variety'] !== $current['variety']
        ) {
            $this->api->respond_error(
                'Variety cannot be changed because this purchase already has a drying record.',
                422
            );
        }

        $weightStatement = $this->db->raw(
            "SELECT COALESCE(SUM(start_weight_kg), 0)
             FROM drying_records
             WHERE palay_purchasing_id = ?",
            [(int) $current['id']]
        );

        $usedWeight = (float) $weightStatement->fetchColumn();

        if ($data['quantity_kg'] < $usedWeight) {
            $this->api->respond_error(
                'Purchased quantity cannot be lower than the weight already assigned to drying.',
                422
            );
        }

        $this->models['purchasing']->_update(
            (int) $current['id'],
            $data
        );

        $this->api->respond([
            'message' => 'Palay purchase updated successfully.'
        ]);
    }

    public function delete_purchasing($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_mill_access();

        $record = $this->find_record('purchasing', $id);

        $statement = $this->db->raw(
            "SELECT COUNT(*)
             FROM drying_records
             WHERE palay_purchasing_id = ?",
            [(int) $record['id']]
        );

        if ((int) $statement->fetchColumn() > 0) {
            $this->api->respond_error(
                'This purchase cannot be deleted because it already has a drying record.',
                422
            );
        }

        $this->models['purchasing']->_delete(
            (int) $record['id']
        );

        $this->api->respond([
            'message' => 'Palay purchase deleted successfully.'
        ]);
    }

    private function validate_unique_batch_code($batchCode, $excludeId = null)
    {
        $sql = "
            SELECT COUNT(*)
            FROM palay_purchasing
            WHERE batch_code = ?
        ";

        $params = [$batchCode];

        if ($excludeId !== null) {
            $sql .= " AND id <> ?";
            $params[] = $excludeId;
        }

        $statement = $this->db->raw($sql, $params);

        if ((int) $statement->fetchColumn() > 0) {
            $this->api->respond_error(
                'This batch code already exists. Please use a different batch code.',
                422
            );
        }
    }

    /* =========================================================
       DRYING
    ========================================================= */

    public function drying()
    {
        $this->api->require_method('GET');
        $this->authorize_mill_access();

        $statement = $this->db->raw(
            "SELECT
                d.*,
                p.supplier_name,
                p.purchase_date,
                p.quantity_kg AS purchased_quantity_kg,
                p.variety,
                GREATEST(
                    d.final_weight_kg - COALESCE((
                        SELECT SUM(m.dried_input_kg)
                        FROM milling_records m
                        WHERE m.drying_record_id = d.id
                        AND m.status <> 'Cancelled'
                    ), 0),
                    0
                ) AS remaining_dried_kg
             FROM drying_records d
             LEFT JOIN palay_purchasing p
                ON p.id = d.palay_purchasing_id
             ORDER BY d.id DESC"
        );

        $this->api->respond(
            $statement->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    public function drying_record($id)
    {
        $this->api->require_method('GET');
        $this->authorize_mill_access();

        $record = $this->find_record('drying', $id);

        $statement = $this->db->raw(
            "SELECT
                d.*,
                p.supplier_name,
                p.purchase_date,
                p.quantity_kg AS purchased_quantity_kg,
                p.variety
             FROM drying_records d
             LEFT JOIN palay_purchasing p
                ON p.id = d.palay_purchasing_id
             WHERE d.id = ?
             LIMIT 1",
            [(int) $record['id']]
        );

        $this->api->respond(
            $statement->fetch(PDO::FETCH_ASSOC) ?: $record
        );
    }

    public function add_drying()
    {
        $this->api->require_method('POST');
        $this->authorize_mill_access();

        $input = $this->api->body();

        $this->require_fields($input, [
            'drying_id',
            'palay_purchasing_id',
            'start_weight_kg',
            'status'
        ]);

        $data = $this->drying_data($input);

        $duplicate = $this->db->raw(
            "SELECT COUNT(*)
             FROM drying_records
             WHERE palay_purchasing_id = ?",
            [$data['palay_purchasing_id']]
        );

        if ((int) $duplicate->fetchColumn() > 0) {
            $this->api->respond_error(
                'This purchase already has a drying record. Edit the existing drying record instead.',
                422
            );
        }

        $id = $this->models['drying']->_insert($data);

        $this->created_response($id, 'Drying record');
    }

    public function update_drying($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_mill_access();

        $current = $this->find_record('drying', $id);
        $input = $this->api->body();

        $this->require_fields($input, ['drying_id']);

        $data = $this->drying_data($input, $current);

        if (
            (int) $data['palay_purchasing_id'] !==
            (int) $current['palay_purchasing_id']
        ) {
            $this->api->respond_error(
                'The purchase linked to an existing drying record cannot be changed.',
                422
            );
        }

        $duplicate = $this->db->raw(
            "SELECT COUNT(*)
             FROM drying_records
             WHERE palay_purchasing_id = ?
             AND id <> ?",
            [
                $data['palay_purchasing_id'],
                (int) $current['id']
            ]
        );

        if ((int) $duplicate->fetchColumn() > 0) {
            $this->api->respond_error(
                'This purchase already has another drying record.',
                422
            );
        }

        $allocatedStatement = $this->db->raw(
            "SELECT COALESCE(SUM(dried_input_kg), 0)
             FROM milling_records
             WHERE drying_record_id = ?
             AND status <> 'Cancelled'",
            [(int) $current['id']]
        );

        $allocated = (float) $allocatedStatement->fetchColumn();

        if ($data['final_weight_kg'] < $allocated) {
            $this->api->respond_error(
                'Final dried weight cannot be lower than the total weight already allocated to milling.',
                422
            );
        }

        $this->models['drying']->_update(
            (int) $current['id'],
            $data
        );

        $this->api->respond([
            'message' => 'Drying record updated successfully.'
        ]);
    }

    public function delete_drying($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_mill_access();

        $record = $this->find_record('drying', $id);

        $statement = $this->db->raw(
            "SELECT COUNT(*)
             FROM milling_records
             WHERE drying_record_id = ?",
            [(int) $record['id']]
        );

        if ((int) $statement->fetchColumn() > 0) {
            $this->api->respond_error(
                'This drying record cannot be deleted because it already has milling sessions.',
                422
            );
        }

        $this->models['drying']->_delete(
            (int) $record['id']
        );

        $this->api->respond([
            'message' => 'Drying record deleted successfully.'
        ]);
    }

    /* =========================================================
       MILLING
    ========================================================= */

    public function milling()
    {
        $this->api->require_method('GET');
        $this->authorize_mill_access();

        $statement = $this->db->raw(
            "SELECT
                m.*,
                d.drying_id,
                d.final_weight_kg,
                p.variety,
                GREATEST(
                    d.final_weight_kg - COALESCE((
                        SELECT SUM(m2.dried_input_kg)
                        FROM milling_records m2
                        WHERE m2.drying_record_id = d.id
                        AND m2.status <> 'Cancelled'
                    ), 0),
                    0
                ) AS remaining_dried_kg
             FROM milling_records m
             LEFT JOIN drying_records d
                ON d.id = m.drying_record_id
             LEFT JOIN palay_purchasing p
                ON p.id = d.palay_purchasing_id
             ORDER BY m.id DESC"
        );

        $this->api->respond(
            $statement->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    public function milling_record($id)
    {
        $this->api->require_method('GET');
        $this->authorize_mill_access();

        $record = $this->find_record('milling', $id);

        $statement = $this->db->raw(
            "SELECT
                m.*,
                d.drying_id,
                d.final_weight_kg,
                p.variety
             FROM milling_records m
             LEFT JOIN drying_records d
                ON d.id = m.drying_record_id
             LEFT JOIN palay_purchasing p
                ON p.id = d.palay_purchasing_id
             WHERE m.id = ?
             LIMIT 1",
            [(int) $record['id']]
        );

        $this->api->respond(
            $statement->fetch(PDO::FETCH_ASSOC) ?: $record
        );
    }

    public function add_milling()
    {
        $this->api->require_method('POST');
        $this->authorize_mill_access();

        $input = $this->api->body();

        $this->require_fields($input, [
            'milling_id',
            'drying_record_id',
            'batch_code',
            'milling_date',
            'dried_input_kg',
            'sacks_50kg',
            'sacks_25kg',
            'loose_rice_kg',
            'bran_kg',
            'broken_rice_kg',
            'status'
        ]);

        $data = $this->milling_data($input);

        $this->begin_transaction();

        try {
            $drying = $this->get_drying_for_milling(
                $data['drying_record_id']
            );

            $data['palay_purchasing_id'] = $drying['palay_purchasing_id'];
            $data['batch_code'] = $drying['batch_code'];

            $this->validate_remaining_weight(
                $data['drying_record_id'],
                $data['dried_input_kg']
            );

            $id = $this->models['milling']->_insert($data);

            if (!$id || $id === false) {
                throw new RuntimeException(
                    'Unable to create milling record.'
                );
            }

            if ($data['status'] === 'Completed') {
                $this->sync_milling_inventory(
                    (int) $id,
                    $data,
                    $drying['variety']
                );
            }

            $this->commit_transaction();

            $this->created_response($id, 'Milling record');

        } catch (Throwable $e) {
            $this->rollback_transaction();

            $this->api->respond_error($e->getMessage(), 422);
        }
    }

    public function update_milling($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_mill_access();

        $current = $this->find_record('milling', $id);
        $input = $this->api->body();

        $this->require_fields($input, [
            'milling_id',
            'drying_record_id',
            'batch_code',
            'milling_date',
            'dried_input_kg',
            'sacks_50kg',
            'sacks_25kg',
            'loose_rice_kg',
            'bran_kg',
            'broken_rice_kg',
            'status'
        ]);

        $data = $this->milling_data($input, $current);

        $this->begin_transaction();

        try {
            $drying = $this->get_drying_for_milling(
                $data['drying_record_id']
            );

            $data['palay_purchasing_id'] = $drying['palay_purchasing_id'];
            $data['batch_code'] = $drying['batch_code'];

            $this->validate_remaining_weight(
                $data['drying_record_id'],
                $data['dried_input_kg'],
                (int) $current['id']
            );

            $this->models['milling']->_update(
                (int) $current['id'],
                $data
            );

            if ($data['status'] === 'Completed') {
                $this->sync_milling_inventory(
                    (int) $current['id'],
                    $data,
                    $drying['variety']
                );
            } else {
                $this->remove_milling_inventory(
                    (int) $current['id']
                );
            }

            $this->commit_transaction();

            $this->api->respond([
                'message' => 'Milling record updated successfully.'
            ]);

        } catch (Throwable $e) {
            $this->rollback_transaction();

            $this->api->respond_error($e->getMessage(), 422);
        }
    }

    public function delete_milling($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_mill_access();

        $record = $this->find_record('milling', $id);

        $this->begin_transaction();

        try {
            $this->remove_milling_inventory(
                (int) $record['id']
            );

            $this->models['milling']->_delete(
                (int) $record['id']
            );

            $this->commit_transaction();

            $this->api->respond([
                'message' => 'Milling record deleted successfully.'
            ]);

        } catch (Throwable $e) {
            $this->rollback_transaction();

            $this->api->respond_error($e->getMessage(), 422);
        }
    }

    /* =========================================================
       MILL INVENTORY
    ========================================================= */

    public function inventory()
    {
        $this->api->require_method('GET');
        $this->authorize_mill_access();

        /*
         * mill_inventory.milling_records_id stores the numeric FK.
         * The Milling page's human-readable code is milling_records.milling_id.
         * Return that code for display without changing the FK relationship.
         */
        $statement = $this->db->raw(
            "SELECT
                mi.*,
                m.milling_id AS milling_code
             FROM mill_inventory mi
             LEFT JOIN milling_records m
                ON m.id = mi.milling_records_id
             ORDER BY mi.id DESC"
        );

        $this->api->respond(
            $statement->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    public function inventory_record($id)
    {
        $this->api->require_method('GET');
        $this->authorize_mill_access();

        $statement = $this->db->raw(
            "SELECT
                mi.*,
                m.milling_id AS milling_code
             FROM mill_inventory mi
             LEFT JOIN milling_records m
                ON m.id = mi.milling_records_id
             WHERE mi.id = ?
             LIMIT 1",
            [(int) $id]
        );

        $record = $statement->fetch(PDO::FETCH_ASSOC);

        if (!$record) {
            $this->api->respond_error('Mill inventory record not found.', 404);
            return;
        }

        $this->api->respond($record);
    }

    public function add_inventory()
    {
        $this->api->require_method('POST');
        $this->authorize_mill_access();

        $input = $this->api->body();

        $this->require_fields($input, [
            'milling_records_id',
            'item_name',
            'variety',
            'category',
            'stock_quantity',
            'unit_price',
            'warehouse_location'
        ]);

        $data = $this->inventory_data($input);

        $data['sack_quantity'] = 0;
        $data['sack_weight_kg'] = null;
        $data['source_quantity'] = 0;
        $data['source_key'] = null;

        $id = $this->models['inventory']->_insert($data);

        $this->created_response($id, 'Mill inventory item');
    }

    public function update_inventory($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_mill_access();

        $current = $this->find_record('inventory', $id);

        if (!empty($current['source_key'])) {
            $this->api->respond_error(
                'This inventory item is automatically managed by a milling session.',
                422
            );
        }

        if ((int) ($current['sack_quantity'] ?? 0) > 0) {
            $this->api->respond_error(
                'Packaged inventory records cannot be edited directly.',
                422
            );
        }

        $input = $this->api->body();

        $this->require_fields($input, [
            'milling_records_id',
            'item_name',
            'variety',
            'category',
            'stock_quantity',
            'unit_price',
            'warehouse_location'
        ]);

        $data = $this->inventory_data($input, $current);

        $data['sack_quantity'] = 0;
        $data['sack_weight_kg'] = null;

        $this->models['inventory']->_update(
            (int) $current['id'],
            $data
        );

        $this->api->respond([
            'message' => 'Mill inventory item updated successfully.'
        ]);
    }

    public function delete_inventory($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_mill_access();

        $record = $this->find_record('inventory', $id);

        if (!empty($record['source_key'])) {
            $this->api->respond_error(
                'This inventory item is automatically managed by a milling session. Delete or update the milling session instead.',
                422
            );
        }

        if ((int) ($record['sack_quantity'] ?? 0) > 0) {
            $this->api->respond_error(
                'Packaged inventory records cannot be deleted directly.',
                422
            );
        }

        $this->models['inventory']->_delete(
            (int) $record['id']
        );

        $this->api->respond([
            'message' => 'Mill inventory item deleted successfully.'
        ]);
    }

    /* =========================================================
       AUTOMATIC MILL INVENTORY
    ========================================================= */

    private function sync_milling_inventory(
        $millingId,
        array $milling,
        $variety
    ) {
        if (
            !is_string($variety) ||
            trim($variety) === ''
        ) {
            throw new RuntimeException(
                'The variety linked to this milling session was not found.'
            );
        }

        /*
         * IMPORTANT:
         * Use the actual sack counts recorded during milling.
         * Never automatically divide total rice output into sacks.
         */

        $sacks50 = (int) $milling['sacks_50kg'];
        $sacks25 = (int) $milling['sacks_25kg'];
        $looseKg = round((float) $milling['loose_rice_kg'], 2);

        $riceItems = [
            [
                'key' => 'RICE:50KG',
                'name' => 'Milled Rice',
                'category' => 'Rice',
                'quantity' => round($sacks50 * 50, 2),
                'sack_quantity' => $sacks50,
                'sack_weight_kg' => 50
            ],
            [
                'key' => 'RICE:25KG',
                'name' => 'Milled Rice',
                'category' => 'Rice',
                'quantity' => round($sacks25 * 25, 2),
                'sack_quantity' => $sacks25,
                'sack_weight_kg' => 25
            ],
            [
                'key' => 'RICE:LOOSE',
                'name' => 'Milled Rice',
                'category' => 'Rice',
                'quantity' => $looseKg,
                'sack_quantity' => 0,
                'sack_weight_kg' => null
            ]
        ];

        /*
         * Handle old bulk rice inventory records from the previous
         * version of the system. Do not silently duplicate old stock.
         */

        $legacyKey = 'MILLING:' . $millingId . ':RICE';

        $legacyStatement = $this->db->raw(
            "SELECT *
             FROM mill_inventory
             WHERE source_key = ?
             LIMIT 1
             FOR UPDATE",
            [$legacyKey]
        );

        $legacy = $legacyStatement->fetch(PDO::FETCH_ASSOC);

        if ($legacy) {
            $packagedStatement = $this->db->raw(
                "SELECT COUNT(*)
                 FROM mill_inventory
                 WHERE milling_records_id = ?
                 AND item_name = 'Milled Rice'
                 AND sack_quantity > 0
                 AND source_key IS NULL",
                [$millingId]
            );

            $hasOldPackages = (int) $packagedStatement->fetchColumn() > 0;

            if ($hasOldPackages) {
                throw new RuntimeException(
                    'This milling record still has manually packaged rice from the previous inventory setup. Please resolve those old packaged records before updating this milling session.'
                );
            }

            $legacyStock = round(
                (float) $legacy['stock_quantity'],
                2
            );

            $legacySource = round(
                (float) $legacy['source_quantity'],
                2
            );

            if (abs($legacyStock - $legacySource) > 0.009) {
                throw new RuntimeException(
                    'This milling record has an old bulk rice inventory entry whose stock has already changed. Please review that inventory record before syncing the new sack breakdown.'
                );
            }

            $this->db->raw(
                "DELETE FROM mill_inventory WHERE id = ?",
                [(int) $legacy['id']]
            );
        }

        foreach ($riceItems as $item) {
            $sourceKey = 'MILLING:' . $millingId . ':' . $item['key'];

            $this->sync_inventory_item(
                $millingId,
                $sourceKey,
                $item,
                $variety
            );
        }

        /*
         * Rice Bran and Broken Rice remain kilogram-only inventory.
         */

        $otherItems = [
            [
                'key' => 'BRAN',
                'name' => 'Rice Bran',
                'category' => 'Bran',
                'quantity' => (float) $milling['bran_kg'],
                'sack_quantity' => 0,
                'sack_weight_kg' => null
            ],
            [
                'key' => 'BROKEN_RICE',
                'name' => 'Broken Rice',
                'category' => 'Broken Rice',
                'quantity' => (float) $milling['broken_rice_kg'],
                'sack_quantity' => 0,
                'sack_weight_kg' => null
            ]
        ];

        foreach ($otherItems as $item) {
            $sourceKey = 'MILLING:' . $millingId . ':' . $item['key'];

            $this->sync_inventory_item(
                $millingId,
                $sourceKey,
                $item,
                $variety
            );
        }
    }

    /**
     * Create or update one automatically generated inventory row.
     *
     * source_quantity = quantity originally generated by milling.
     * stock_quantity = current available stock.
     *
     * Delta syncing preserves stock changes caused by future
     * inventory operations instead of resetting stock blindly.
     */
    private function sync_inventory_item(
        $millingId,
        $sourceKey,
        array $item,
        $variety
    ) {
        $statement = $this->db->raw(
            "SELECT *
             FROM mill_inventory
             WHERE source_key = ?
             LIMIT 1
             FOR UPDATE",
            [$sourceKey]
        );

        $existing = $statement->fetch(PDO::FETCH_ASSOC);

        $newQuantity = round(
            (float) $item['quantity'],
            2
        );

        if (!$existing) {
            if ($newQuantity <= 0) {
                return;
            }

            $this->db->raw(
                "INSERT INTO mill_inventory
                (
                    milling_records_id,
                    item_name,
                    variety,
                    category,
                    stock_quantity,
                    sack_quantity,
                    sack_weight_kg,
                    source_quantity,
                    source_key,
                    unit_price,
                    warehouse_location,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NOW(), NOW())",
                [
                    $millingId,
                    $item['name'],
                    trim($variety),
                    $item['category'],
                    $newQuantity,
                    (int) $item['sack_quantity'],
                    $item['sack_weight_kg'],
                    $newQuantity,
                    $sourceKey
                ]
            );

            return;
        }

        $oldSourceQuantity = round(
            (float) $existing['source_quantity'],
            2
        );

        $currentStock = round(
            (float) $existing['stock_quantity'],
            2
        );

        $updatedStock = round(
            $currentStock + ($newQuantity - $oldSourceQuantity),
            2
        );

        if ($updatedStock < -0.009) {
            throw new RuntimeException(
                'Cannot reduce ' . $item['name'] .
                ' stock for ' . $sourceKey .
                ' because some of the generated stock has already been sold, used, or otherwise deducted.'
            );
        }

        $updatedStock = max(0, $updatedStock);

        $this->db->raw(
            "UPDATE mill_inventory
             SET stock_quantity = ?,
                 sack_quantity = ?,
                 sack_weight_kg = ?,
                 source_quantity = ?,
                 item_name = ?,
                 variety = ?,
                 category = ?,
                 updated_at = NOW()
             WHERE id = ?",
            [
                $updatedStock,
                (int) $item['sack_quantity'],
                $item['sack_weight_kg'],
                $newQuantity,
                $item['name'],
                trim($variety),
                $item['category'],
                (int) $existing['id']
            ]
        );
    }

    private function remove_milling_inventory($millingId)
    {
        /*
         * Old manually packaged rows are not generated source rows.
         * Prevent deleting their parent milling record so they do
         * not become orphaned inventory records.
         */

        $packagedStatement = $this->db->raw(
            "SELECT COUNT(*)
             FROM mill_inventory
             WHERE milling_records_id = ?
             AND sack_quantity > 0
             AND source_key IS NULL",
            [$millingId]
        );

        if ((int) $packagedStatement->fetchColumn() > 0) {
            throw new RuntimeException(
                'Cannot delete this milling session because it still has packaged inventory records from the previous packaging process.'
            );
        }

        $statement = $this->db->raw(
            "SELECT *
             FROM mill_inventory
             WHERE milling_records_id = ?
             AND source_key IS NOT NULL
             FOR UPDATE",
            [$millingId]
        );

        $items = $statement->fetchAll(PDO::FETCH_ASSOC);

        foreach ($items as $item) {
            if (
                (float) $item['stock_quantity'] <
                (float) $item['source_quantity']
            ) {
                throw new RuntimeException(
                    'Cannot delete this milling session because some generated inventory has already been sold or used.'
                );
            }

            $this->db->raw(
                "DELETE FROM mill_inventory WHERE id = ?",
                [(int) $item['id']]
            );
        }
    }

    /* =========================================================
       MILLING VALIDATION
    ========================================================= */

    private function get_drying_for_milling($dryingId)
    {
        $statement = $this->db->raw(
            "SELECT
                d.*,
                p.variety
             FROM drying_records d
             INNER JOIN palay_purchasing p
                ON p.id = d.palay_purchasing_id
             WHERE d.id = ?
             LIMIT 1",
            [$dryingId]
        );

        $drying = $statement->fetch(PDO::FETCH_ASSOC);

        if (!$drying) {
            throw new RuntimeException(
                'Selected drying record or its linked purchase was not found.'
            );
        }

        if ($drying['status'] !== 'Completed') {
            throw new RuntimeException(
                'Only completed drying records can be used for milling.'
            );
        }

        return $drying;
    }

    private function validate_remaining_weight(
        $dryingId,
        $requestedWeight,
        $excludeMillingId = null
    ) {
        $sql = "
            SELECT COALESCE(SUM(dried_input_kg), 0)
            FROM milling_records
            WHERE drying_record_id = ?
            AND status <> 'Cancelled'
        ";

        $params = [$dryingId];

        if ($excludeMillingId !== null) {
            $sql .= " AND id <> ?";
            $params[] = $excludeMillingId;
        }

        $statement = $this->db->raw($sql, $params);

        $usedWeight = (float) $statement->fetchColumn();

        $dryingStatement = $this->db->raw(
            "SELECT final_weight_kg
             FROM drying_records
             WHERE id = ?
             LIMIT 1",
            [$dryingId]
        );

        $finalWeight = (float) $dryingStatement->fetchColumn();

        $remaining = round($finalWeight - $usedWeight, 2);

        if ($requestedWeight <= 0) {
            throw new RuntimeException(
                'Dried input must be greater than zero.'
            );
        }

        if ($requestedWeight > $remaining) {
            throw new RuntimeException(
                'Insufficient dried weight. Remaining dried weight: ' .
                number_format(max(0, $remaining), 2) . ' kg.'
            );
        }
    }

    /* =========================================================
       DATA PREPARATION
    ========================================================= */

    private function purchasing_data(
        array $input,
        array $current = []
    ) {
        $quantity = $this->number_value(
            $input,
            $current,
            'quantity_kg',
            'Quantity',
            99999999.99
        );

        $price = $this->number_value(
            $input,
            $current,
            'price_per_kg',
            'Price per kilogram',
            99999999.99
        );

        $total = round($quantity * $price, 2);

        if ($total > 99999999.99) {
            $this->api->respond_error(
                'Calculated purchase total exceeds the supported amount.',
                422
            );
        }

        return [
            'batch_code' => $this->string_value(
                $input,
                $current,
                'batch_code',
                'Batch code',
                50,
                true
            ),

            'variety' => $this->string_value(
                $input,
                $current,
                'variety',
                'Rice variety',
                100,
                true
            ),

            'supplier_name' => $this->string_value(
                $input,
                $current,
                'supplier_name',
                'Supplier name',
                150,
                true
            ),

            'purchase_date' => $this->date_value(
                $input,
                $current,
                'purchase_date',
                'Purchase date'
            ),

            'quantity_kg' => $quantity,
            'price_per_kg' => $price,
            'total_amount' => $total,

            'payment_status' => $this->string_value(
                $input,
                $current,
                'payment_status',
                'Payment status',
                50,
                true,
                'Unpaid'
            ),

            'status' => $this->string_value(
                $input,
                $current,
                'status',
                'Status',
                50,
                true,
                'Pending'
            )
        ];
    }

    private function drying_data(
        array $input,
        array $current = []
    ) {
        $purchaseId = $this->foreign_id(
            $input,
            $current,
            'palay_purchasing_id',
            'purchasing'
        );

        if (!$purchaseId) {
            $this->api->respond_error(
                'Please select a purchase record.',
                422
            );
        }

        $purchaseStatement = $this->db->raw(
            "SELECT *
             FROM palay_purchasing
             WHERE id = ?
             LIMIT 1",
            [$purchaseId]
        );

        $purchase = $purchaseStatement->fetch(PDO::FETCH_ASSOC);

        if (!$purchase) {
            $this->api->respond_error(
                'Selected purchase record was not found.',
                422
            );
        }

        $startWeight = $this->number_value(
            $input,
            $current,
            'start_weight_kg',
            'Starting weight',
            99999999.99
        );

        $finalWeight = $this->number_value(
            $input,
            $current,
            'final_weight_kg',
            'Final weight',
            99999999.99
        );

        if ($startWeight <= 0) {
            $this->api->respond_error(
                'Starting weight must be greater than zero.',
                422
            );
        }

        if ($startWeight > (float) $purchase['quantity_kg']) {
            $this->api->respond_error(
                'Starting weight cannot exceed the purchased quantity of ' .
                number_format((float) $purchase['quantity_kg'], 2) . ' kg.',
                422
            );
        }

        if ($finalWeight > $startWeight) {
            $this->api->respond_error(
                'Final weight cannot exceed starting weight.',
                422
            );
        }

        return [
            'drying_id' => $this->string_value(
                $input,
                $current,
                'drying_id',
                'Drying code',
                50,
                true
            ),

            'palay_purchasing_id' => $purchaseId,
            'batch_code' => $purchase['batch_code'],

            'start_date' => $this->date_value(
                $input,
                $current,
                'start_date',
                'Start date'
            ),

            'end_date' => $this->date_value(
                $input,
                $current,
                'end_date',
                'End date'
            ),

            'start_weight_kg' => $startWeight,
            'final_weight_kg' => $finalWeight,

            'drying_cost' => $this->number_value(
                $input,
                $current,
                'drying_cost',
                'Drying cost',
                99999999.99
            ),

            'status' => $this->string_value(
                $input,
                $current,
                'status',
                'Status',
                50,
                true,
                'In Progress'
            )
        ];
    }

    private function milling_data(
        array $input,
        array $current = []
    ) {
        $dryingId = $this->foreign_id(
            $input,
            $current,
            'drying_record_id',
            'drying'
        );

        if (!$dryingId) {
            $this->api->respond_error(
                'A drying record must be selected.',
                422
            );
        }

        $driedInput = $this->number_value(
            $input,
            $current,
            'dried_input_kg',
            'Dried input',
            99999999.99
        );

        /*
         * Sack counts must be whole numbers.
         * They represent actual sacks produced, not estimates.
         */

        $sacks50 = $this->integer_value(
            $input,
            $current,
            'sacks_50kg',
            '50 kg sack count',
            1999999
        );

        $sacks25 = $this->integer_value(
            $input,
            $current,
            'sacks_25kg',
            '25 kg sack count',
            3999999
        );

        $looseRice = $this->number_value(
            $input,
            $current,
            'loose_rice_kg',
            'Loose rice',
            99999999.99
        );

        $bran = $this->number_value(
            $input,
            $current,
            'bran_kg',
            'Bran output',
            99999999.99
        );

        $broken = $this->number_value(
            $input,
            $current,
            'broken_rice_kg',
            'Broken rice output',
            99999999.99
        );

        /*
         * Compute rice output using actual packaging inputs.
         * Do not accept rice_output_kg from the frontend.
         */

        $rice = round(
            ($sacks50 * 50) +
            ($sacks25 * 25) +
            $looseRice,
            2
        );

        $totalOutputs = round(
            $rice + $bran + $broken,
            2
        );

        if ($totalOutputs > $driedInput) {
            $this->api->respond_error(
                'Combined milling outputs cannot exceed dried input. Computed rice output: ' .
                number_format($rice, 2) . ' kg.',
                422
            );
        }

        $status = $this->string_value(
            $input,
            $current,
            'status',
            'Status',
            50,
            true,
            'Completed'
        );

        $recoveryRate = $driedInput > 0
            ? number_format(
                ($rice / $driedInput) * 100,
                2,
                '.',
                ''
            ) . '%'
            : null;

        return [
            'milling_id' => $this->string_value(
                $input,
                $current,
                'milling_id',
                'Milling code',
                50,
                true
            ),

            'drying_record_id' => $dryingId,
            'palay_purchasing_id' => null,

            'batch_code' => $this->string_value(
                $input,
                $current,
                'batch_code',
                'Batch code',
                50,
                true
            ),

            'milling_date' => $this->date_value(
                $input,
                $current,
                'milling_date',
                'Milling date'
            ),

            'dried_input_kg' => $driedInput,

            'sacks_50kg' => $sacks50,
            'sacks_25kg' => $sacks25,
            'loose_rice_kg' => $looseRice,

            'rice_output_kg' => $rice,
            'bran_kg' => $bran,
            'broken_rice_kg' => $broken,
            'recovery_rate' => $recoveryRate,
            'status' => $status
        ];
    }

    private function inventory_data(
        array $input,
        array $current = []
    ) {
        return [
            'milling_records_id' => $this->foreign_id(
                $input,
                $current,
                'milling_records_id',
                'milling'
            ),

            'item_name' => $this->string_value(
                $input,
                $current,
                'item_name',
                'Item name',
                150,
                true
            ),

            'variety' => $this->string_value(
                $input,
                $current,
                'variety',
                'Rice variety',
                100,
                true
            ),

            'category' => $this->string_value(
                $input,
                $current,
                'category',
                'Category',
                50,
                true
            ),

            'stock_quantity' => $this->number_value(
                $input,
                $current,
                'stock_quantity',
                'Stock quantity',
                99999999.99
            ),

            'sack_quantity' => 0,
            'sack_weight_kg' => null,

            'unit_price' => $this->number_value(
                $input,
                $current,
                'unit_price',
                'Unit price',
                99999999.99
            ),

            'warehouse_location' => $this->string_value(
                $input,
                $current,
                'warehouse_location',
                'Warehouse location',
                100,
                false
            )
        ];
    }

    /* =========================================================
       COMMON HELPERS
    ========================================================= */

    private function find_record($key, $id)
    {
        if (
            !is_scalar($id) ||
            !ctype_digit((string) $id) ||
            (int) $id < 1
        ) {
            $this->api->respond_error(
                'A valid record ID is required.',
                422
            );
        }

        $record = $this->models[$key]->_find((int) $id);

        if (!$record) {
            $this->api->respond_error(
                'Record not found.',
                404
            );
        }

        return $record;
    }

    private function require_fields(
        array $input,
        array $fields
    ) {
        if (!array_intersect($fields, array_keys($input))) {
            $this->api->respond_error(
                'At least one supported field is required.',
                422
            );
        }
    }

    private function string_value(
        array $input,
        array $current,
        $key,
        $label,
        $maximum,
        $required,
        $default = null
    ) {
        $value = array_key_exists($key, $input)
            ? $input[$key]
            : ($current[$key] ?? $default);

        if ($value === null || $value === '') {
            if ($required) {
                $this->api->respond_error(
                    $label . ' is required.',
                    422
                );
            }

            return null;
        }

        if (
            !is_string($value) ||
            strlen($value) > $maximum ||
            ($required && trim($value) === '')
        ) {
            $this->api->respond_error(
                $label .
                ' must be a non-empty value of at most ' .
                $maximum . ' characters.',
                422
            );
        }

        return trim($value);
    }

    private function date_value(
        array $input,
        array $current,
        $key,
        $label
    ) {
        $value = array_key_exists($key, $input)
            ? $input[$key]
            : ($current[$key] ?? null);

        if ($value === null || $value === '') {
            return null;
        }

        $date = is_string($value)
            ? DateTime::createFromFormat('!Y-m-d', $value)
            : false;

        if (!$date || $date->format('Y-m-d') !== $value) {
            $this->api->respond_error(
                $label . ' must use YYYY-MM-DD format.',
                422
            );
        }

        return $value;
    }

    private function number_value(
        array $input,
        array $current,
        $key,
        $label,
        $maximum
    ) {
        $value = array_key_exists($key, $input)
            ? $input[$key]
            : ($current[$key] ?? 0);

        if (
            !is_numeric($value) ||
            !is_finite((float) $value) ||
            (float) $value < 0 ||
            (float) $value > $maximum
        ) {
            $this->api->respond_error(
                $label . ' must be between 0 and ' . $maximum . '.',
                422
            );
        }

        return round((float) $value, 2);
    }

    /**
     * Validate a whole-number input such as actual sack counts.
     */
    private function integer_value(
        array $input,
        array $current,
        $key,
        $label,
        $maximum
    ) {
        $value = array_key_exists($key, $input)
            ? $input[$key]
            : ($current[$key] ?? 0);

        if (
            $value === null ||
            $value === ''
        ) {
            $value = 0;
        }

        if (
            !is_numeric($value) ||
            !is_finite((float) $value) ||
            (float) $value < 0 ||
            (float) $value > $maximum ||
            floor((float) $value) !== (float) $value
        ) {
            $this->api->respond_error(
                $label . ' must be a whole number between 0 and ' . $maximum . '.',
                422
            );
        }

        return (int) $value;
    }

    private function foreign_id(
        array $input,
        array $current,
        $key,
        $table
    ) {
        $value = array_key_exists($key, $input)
            ? $input[$key]
            : ($current[$key] ?? null);

        if ($value === null || $value === '') {
            return null;
        }

        if (
            (!is_string($value) && !is_int($value)) ||
            !ctype_digit((string) $value) ||
            (int) $value < 1
        ) {
            $this->api->respond_error(
                ucwords(str_replace('_', ' ', $key)) .
                ' must be a positive integer.',
                422
            );
        }

        $tableName = [
            'purchasing' => 'palay_purchasing',
            'drying' => 'drying_records',
            'milling' => 'milling_records'
        ][$table] ?? null;

        if (!$tableName) {
            $this->api->respond_error(
                'Invalid related record type.',
                422
            );
        }

        $statement = $this->db->raw(
            "SELECT id
             FROM {$tableName}
             WHERE id = ?
             LIMIT 1",
            [(int) $value]
        );

        if ($statement->fetchColumn() === false) {
            $this->api->respond_error(
                ucwords(str_replace('_', ' ', $key)) .
                ' record not found.',
                422
            );
        }

        return (int) $value;
    }

    private function created_response($id, $label)
    {
        if ($id === false || $id === null) {
            $this->api->respond_error(
                'Unable to create ' . strtolower($label) . '.',
                500
            );
        }

        $this->api->respond([
            'message' => $label . ' created successfully.',
            'id' => $id
        ], 201);
    }

    /* =========================================================
       DATABASE TRANSACTIONS
    ========================================================= */

    private function begin_transaction()
    {
        $this->db->raw('START TRANSACTION');
    }

    private function commit_transaction()
    {
        $this->db->raw('COMMIT');
    }

    private function rollback_transaction()
    {
        try {
            $this->db->raw('ROLLBACK');
        } catch (Throwable $e) {
            // Preserve the original error.
        }
    }

    /* =========================================================
       AUTHORIZATION
    ========================================================= */

    private function authorize_mill_access()
    {
        $claims = $this->api->require_jwt();

        $statement = $this->db->raw(
            'SELECT role, section, is_active
             FROM users
             WHERE id = ?
             LIMIT 1',
            [$claims['sub']]
        );

        $user = $statement->fetch(PDO::FETCH_ASSOC);

        if (!$user || !(int) $user['is_active']) {
            $this->api->respond_error(
                'Unauthorized.',
                401
            );
        }

        if (
            !in_array($user['role'], ['admin'], true) &&
            !(
                $user['role'] === 'section_admin' &&
                $user['section'] === 'mill'
            )
        ) {
            $this->api->respond_error(
                'You are not authorized to access the mill section.',
                403
            );
        }
    }
}
