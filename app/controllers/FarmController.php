<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class FarmController extends Controller
{
    private $farm_act_model;
    private $inventory_model;
    private $planting_model;
    private $input_application_model;
    private $api;
    private $db;

    public function __construct()
    {
        parent::__construct();

        $this->db = $this->call->database();
        $this->farm_act_model = $this->call->model('FarmActModel');
        $this->inventory_model = $this->call->model('FInventoryModel');
        $this->planting_model = $this->call->model('PlantingModel');
        $this->input_application_model = $this->call->model('FarmInputApplicationModel');
        $this->api = $this->call->library('api');
    }



public function palay_prediction()
{
    $this->api->require_method('POST');
    $this->api->rate_limit('palay_prediction', 20, 60);
    $this->authorize_farm_access();

    $input = $this->api->body();

    if (
        !is_array($input) ||
        !isset($input['farm_planting_harvesting_id']) ||
        $input['farm_planting_harvesting_id'] === ''
    ) {
        $this->api->respond_error(
            'Please select a planting/harvesting record.',
            422
        );
    }

    $cycle_id = $this->validate_record_id(
        $input['farm_planting_harvesting_id']
    );

    // Get planting cycle details.
    $statement = $this->db->raw(
        'SELECT
            id,
            planting_date,
            area_hectares,
            rice_variety,
            status
         FROM farm_planting_harvesting
         WHERE id = ?
         LIMIT 1',
        [$cycle_id]
    );

    $planting = $statement->fetch(PDO::FETCH_ASSOC);

    if (!$planting) {
        $this->api->respond_error(
            'Selected planting/harvesting record was not found.',
            404
        );
    }

    // Validate planting date.
    $planting_date = $planting['planting_date'] ?? null;

    if (
        !is_string($planting_date) ||
        trim($planting_date) === ''
    ) {
        $this->api->respond_error(
            'The selected planting cycle has no valid planting date.',
            422
        );
    }

    try {
        $date = new DateTime($planting_date);
        $year = (int) $date->format('Y');
    } catch (Throwable $e) {
        $this->api->respond_error(
            'Unable to determine the planting year.',
            422
        );
    }

    if ($year < 1900 || $year > 2200) {
        $this->api->respond_error(
            'The planting year is outside the supported prediction range.',
            422
        );
    }

    // Validate area.
    $area = $planting['area_hectares'] ?? null;

    if (
        !is_numeric($area) ||
        !is_finite((float) $area) ||
        (float) $area <= 0 ||
        (float) $area > 99999999.99
    ) {
        $this->api->respond_error(
            'The selected planting cycle has an invalid area.',
            422
        );
    }

    // Get fertilizer totals for the selected planting cycle.
    $fertilizer_statement = $this->db->raw(
        "SELECT
            input_category,
            SUM(quantity) AS total_quantity
         FROM farm_input_application
         WHERE farm_planting_harvesting_id = ?
           AND unit = 'kg'
           AND input_category IN ('NPK', 'OTHER')
         GROUP BY input_category",
        [$cycle_id]
    );

    $fertilizer_rows = $fertilizer_statement->fetchAll(PDO::FETCH_ASSOC);

    $npk_kg = 0.0;
    $other_kg = 0.0;

    foreach ($fertilizer_rows as $row) {
        $category = strtoupper($row['input_category']);

        if ($category === 'NPK') {
            $npk_kg = (float) $row['total_quantity'];
        } elseif ($category === 'OTHER') {
            $other_kg = (float) $row['total_quantity'];
        }
    }

    // Prepare all four prediction features.
    $validated = [
        'year' => $year,
        'area_hectares' => (float) $area,
        'npk_kg' => $npk_kg,
        'other_kg' => $other_kg,
    ];

    // FastAPI endpoint.
    $ml_url = getenv('PALAY_ML_API_URL');

    if (!$ml_url) {
        if (getenv('APP_ENV') === 'production') {
            log_message(
                'error',
                'Palay ML prediction failed: PALAY_ML_API_URL is not configured.'
            );

            $this->api->respond_error(
                'The Palay prediction service is not configured. Set PALAY_ML_API_URL to the deployed ML API /predict endpoint.',
                503
            );
        }

        $ml_url = 'http://127.0.0.1:8001/predict';
    }

    if (!function_exists('curl_init')) {
        log_message(
            'error',
            'Palay ML prediction failed: PHP cURL extension is not enabled.'
        );

        $this->api->respond_error(
            'PHP cURL extension is unavailable.',
            503
        );
    }

    $json_payload = json_encode($validated);

    if ($json_payload === false) {
        $this->api->respond_error(
            'Unable to prepare the prediction request.',
            500
        );
    }

    $curl = curl_init($ml_url);

    if ($curl === false) {
        $this->api->respond_error(
            'Unable to initialize the Palay prediction request.',
            503
        );
    }

    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $json_payload,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 30,
    ]);

    $response_body = curl_exec($curl);
    $curl_error = curl_error($curl);
    $http_status = (int) curl_getinfo(
        $curl,
        CURLINFO_HTTP_CODE
    );

    curl_close($curl);

    if ($response_body === false) {
        log_message(
            'error',
            'Palay ML service connection failed: ' . $curl_error
        );

        $this->api->respond_error(
            'Unable to connect to the Palay prediction service.',
            502
        );
    }

    $ml_response = json_decode($response_body, true);

    if (!is_array($ml_response)) {
        log_message(
            'error',
            'Palay ML service returned invalid JSON. HTTP status: ' .
            $http_status
        );

        $this->api->respond_error(
            'The Palay prediction service returned an invalid response.',
            502
        );
    }

    if ($http_status < 200 || $http_status >= 300) {
        log_message(
            'error',
            'Palay ML service rejected prediction. HTTP status: ' .
            $http_status . '; response: ' . $response_body
        );

        $this->api->respond_error(
            'The Palay prediction service could not process the selected planting cycle.',
            502
        );
    }

    if (
        !isset(
            $ml_response['prediction_tonnes'],
            $ml_response['prediction_kg']
        ) ||
        !is_numeric($ml_response['prediction_tonnes']) ||
        !is_numeric($ml_response['prediction_kg']) ||
        !is_finite((float) $ml_response['prediction_tonnes']) ||
        !is_finite((float) $ml_response['prediction_kg'])
    ) {
        log_message(
            'error',
            'Palay ML service returned an unexpected response schema. Keys: ' .
            implode(', ', array_keys($ml_response))
        );

        $this->api->respond_error(
            'The configured PALAY_ML_API_URL did not return a prediction. Set it to the deployed ML API /predict endpoint and redeploy the backend.',
            502
        );
    }

    // Include planting details and fertilizer totals.
    $ml_response['planting_cycle'] = [
        'farm_planting_harvesting_id' => $cycle_id,
        'planting_date' => $planting_date,
        'year' => $year,
        'area_hectares' => (float) $area,
        'rice_variety' => $planting['rice_variety'] ?? null,
    ];

    $ml_response['fertilizer_totals'] = [
        'NPK_KG' => $npk_kg,
        'OTHER_KG' => $other_kg,
    ];

    // No database record is created or updated.
    $this->api->respond($ml_response, 200);
}

    // =========================================================
    // FARM ACTIVITIES
    // =========================================================

    public function farm_activities()
    {
        $this->api->require_method('GET');
        $this->api->rate_limit('farm_activities', 120, 60);
        $this->authorize_farm_access();

        $this->api->respond(
            $this->farm_act_model->get_all_with_planting()
        );
    }

    public function farm_activity($id)
    {
        $this->api->require_method('GET');
        $this->authorize_farm_access();

        $this->api->respond(
            $this->find_record($this->farm_act_model, $id, 'Farm activity')
        );
    }

    public function add_farm_activity()
    {
        $this->api->require_method('POST');
        $this->api->rate_limit('farm_add_activity', 30, 60);
        $this->authorize_farm_access();

        $input = $this->api->body();

        $this->require_fields($input, [
            'farm_planting_harvesting_id',
            'activity',
        ]);

        $data = $this->activity_data($input);

        $data['record_code'] = 'TEMP-' . bin2hex(random_bytes(12));

        $transaction_started = false;

        try {
            $this->db->transaction();
            $transaction_started = true;

            $id = $this->farm_act_model->_insert($data);

            if ($id === false || !is_numeric($id) || (int) $id < 1) {
                throw new Exception('Farm activity insert failed.');
            }

            $id = (int) $id;

            $record_code = 'ACT-' . str_pad(
                (string) $id,
                6,
                '0',
                STR_PAD_LEFT
            );

            $statement = $this->db->raw(
                'UPDATE farm_act
                SET record_code = ?
                WHERE id = ?',
                [$record_code, $id]
            );

            if (!$statement || $statement->rowCount() !== 1) {
                throw new Exception('Farm activity record code update failed.');
            }

            $this->db->commit();
            $transaction_started = false;

            $this->api->respond([
                'message' => 'Farm activity added successfully.',
                'id' => $id,
                'record_code' => $record_code
            ], 201);

        } catch (Throwable $e) {
            if ($transaction_started) {
                $this->db->roll_back();
            }

            log_message(
                'error',
                'Farm activity creation failed: ' . $e->getMessage()
            );

            $this->api->respond_error(
                'Unable to add farm activity. Please try again.',
                500
            );
        }
    }

    public function update_farm_activity($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_farm_access();

        $current = $this->find_record(
            $this->farm_act_model,
            $id,
            'Farm activity'
        );

        $input = $this->api->body();

    $this->require_fields($input, [
        'farm_planting_harvesting_id',
        'activity',
    ]);

        $data = $this->activity_data($input, $current);

        // Preserve the original record code.
        $this->farm_act_model->_update(
            (int) $current['id'],
            $data
        );

        $this->api->respond([
            'message' => 'Farm activity updated successfully.',
            'record_code' => $current['record_code']
        ]);
    }

    public function delete_farm_activity($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_farm_access();

        $record = $this->find_record(
            $this->farm_act_model,
            $id,
            'Farm activity'
        );

        $this->farm_act_model->_delete((int) $record['id']);

        $this->api->respond([
            'message' => 'Farm activity deleted successfully.'
        ]);
    }

    // =========================================================
    // FARM INVENTORY
    // =========================================================

    public function farm_inventory()
    {
        $this->api->require_method('GET');
        $this->api->rate_limit('farm_inventory', 120, 60);
        $this->authorize_farm_access();

        $this->api->respond($this->inventory_model->_all());
    }

    public function farm_inventory_item($id)
    {
        $this->api->require_method('GET');
        $this->authorize_farm_access();

        $this->api->respond(
            $this->find_record(
                $this->inventory_model,
                $id,
                'Farm inventory item'
            )
        );
    }

    public function add_farm_inventory()
    {
        $this->api->require_method('POST');
        $this->api->rate_limit('farm_add_inventory', 30, 60);
        $this->authorize_farm_access();

        $input = $this->api->body();

        $this->require_fields($input, [
            'season_id',
            'farm_act_id',
            'item_category',
            'item_name',
            'quantity',
            'unit',
            'unit_price',
            'date_acquired',
        ]);

        $data = $this->inventory_data($input);
        $id = $this->inventory_model->_insert($data);

        if ($id === false) {
            $this->api->respond_error(
                'Unable to add farm inventory item.',
                500
            );
        }

        $this->api->respond([
            'message' => 'Farm inventory item added successfully.',
            'id' => $id
        ], 201);
    }

    public function update_farm_inventory($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_farm_access();

        $current = $this->find_record(
            $this->inventory_model,
            $id,
            'Farm inventory item'
        );

        $input = $this->api->body();

        $fields = [
            'season_id',
            'farm_act_id',
            'item_category',
            'item_name',
            'quantity',
            'unit',
            'unit_price',
            'date_acquired',
        ];

        $this->require_fields($input, $fields);

        $data = $this->inventory_data($input, $current);

        $this->inventory_model->_update(
            (int) $current['id'],
            $data
        );

        $this->api->respond([
            'message' => 'Farm inventory item updated successfully.'
        ]);
    }

    public function delete_farm_inventory($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_farm_access();

        $record = $this->find_record(
            $this->inventory_model,
            $id,
            'Farm inventory item'
        );

        $this->inventory_model->_delete((int) $record['id']);

        $this->api->respond([
            'message' => 'Farm inventory item deleted successfully.'
        ]);
    }

    // =========================================================
    // PLANTING AND HARVESTING
    // =========================================================

    public function planting_harvesting()
    {
        $this->api->require_method('GET');
        $this->api->rate_limit('farm_planting_harvesting', 120, 60);
        $this->authorize_farm_access();

        $this->api->respond($this->planting_model->_all());
    }

    public function planting_harvesting_record($id)
    {
        $this->api->require_method('GET');
        $this->authorize_farm_access();

        $this->api->respond(
            $this->find_record(
                $this->planting_model,
                $id,
                'Planting/harvesting record'
            )
        );
    }

    public function add_planting_harvesting()
    {
        $this->api->require_method('POST');
        $this->api->rate_limit('farm_add_planting_harvesting', 30, 60);
        $this->authorize_farm_access();

        $input = $this->api->body();

        $this->require_fields($input, [
            'record_code',
            'season',
            'field_name',
            'area_hectares',
            'crop',
            'rice_variety',
            'method',
            'planting_date',
            'expected_harvest_date',
            'actual_harvest_date',
            'harvested_yield',
            'status',
        ]);

        $id = $this->planting_model->_insert(
            $this->planting_data($input)
        );

        if ($id === false) {
            $this->api->respond_error(
                'Unable to add planting/harvesting record.',
                500
            );
        }

        $this->api->respond([
            'message' => 'Planting/harvesting record added successfully.',
            'id' => $id
        ], 201);
    }

    public function update_planting_harvesting($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_farm_access();

        $current = $this->find_record(
            $this->planting_model,
            $id,
            'Planting/harvesting record'
        );

        $input = $this->api->body();

        $this->require_fields($input, [
            'record_code',
            'season',
            'field_name',
            'area_hectares',
            'crop',
            'rice_variety',
            'method',
            'planting_date',
            'expected_harvest_date',
            'actual_harvest_date',
            'harvested_yield',
            'status',
        ]);

        $this->planting_model->_update(
            (int) $current['id'],
            $this->planting_data($input, $current)
        );

        $this->api->respond([
            'message' => 'Planting/harvesting record updated successfully.'
        ]);
    }

    public function delete_planting_harvesting($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_farm_access();

        $record = $this->find_record(
            $this->planting_model,
            $id,
            'Planting/harvesting record'
        );

        $this->planting_model->_delete((int) $record['id']);

        $this->api->respond([
            'message' => 'Planting/harvesting record deleted successfully.'
        ]);
    }

    // =========================================================
    // FARM INPUT / FERTILIZER APPLICATIONS
    // =========================================================

    public function input_applications()
    {
        $this->api->require_method('GET');
        $this->api->rate_limit('farm_input_applications', 120, 60);
        $this->authorize_farm_access();

        $statement = $this->db->raw(
            'SELECT *
             FROM farm_input_application
             ORDER BY application_date DESC, id DESC'
        );

        $this->api->respond(
            $statement->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    public function input_application($id)
    {
        $this->api->require_method('GET');
        $this->authorize_farm_access();

        $record = $this->find_record(
            $this->input_application_model,
            $id,
            'Input application'
        );

        $this->api->respond($record);
    }

    public function input_applications_by_cycle($id)
    {
        $this->api->require_method('GET');
        $this->authorize_farm_access();

        $cycle_id = $this->validate_record_id($id);

        if (!$this->record_exists('farm_planting_harvesting', $cycle_id)) {
            $this->api->respond_error(
                'Planting/harvesting record not found.',
                404
            );
        }

        $statement = $this->db->raw(
            'SELECT *
             FROM farm_input_application
             WHERE farm_planting_harvesting_id = ?
             ORDER BY application_date DESC, id DESC',
            [$cycle_id]
        );

        $this->api->respond(
            $statement->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    public function input_application_totals($id)
    {
        $this->api->require_method('GET');
        $this->authorize_farm_access();

        $cycle_id = $this->validate_record_id($id);

        if (!$this->record_exists('farm_planting_harvesting', $cycle_id)) {
            $this->api->respond_error(
                'Planting/harvesting record not found.',
                404
            );
        }

        $statement = $this->db->raw(
            'SELECT
                input_category,
                unit,
                SUM(quantity) AS total_quantity
             FROM farm_input_application
             WHERE farm_planting_harvesting_id = ?
             GROUP BY input_category, unit
             ORDER BY input_category, unit',
            [$cycle_id]
        );

        $rows = $statement->fetchAll(PDO::FETCH_ASSOC);

        $totals = [
            'NPK' => [],
            'OTHER' => [],
            'PESTICIDE' => [],
        ];

        foreach ($rows as $row) {
            $category = strtoupper($row['input_category']);
            $unit = $row['unit'];

            if (!isset($totals[$category])) {
                continue;
            }

            $totals[$category][] = [
                'unit' => $unit,
                'quantity' => (float) $row['total_quantity']
            ];
        }

        $this->api->respond([
            'farm_planting_harvesting_id' => $cycle_id,
            'totals' => $totals,
            'note' => 'Quantities are grouped by category and unit. PESTICIDE is tracked separately and must not be included in fertilizer totals for harvest prediction.'
        ]);
    }

    /**
     * Add an input application.
     * Record code is generated automatically using the inserted ID.
     */
    public function add_input_application()
    {
        $this->api->require_method('POST');
        $this->api->rate_limit('farm_add_input_application', 30, 60);
        $this->authorize_farm_access();

        $input = $this->api->body();

        // Validate required request fields before starting transaction.
        $required_fields = [
            'farm_planting_harvesting_id',
            'input_category',
            'input_name',
            'quantity',
            'unit',
            'application_date',
        ];

        foreach ($required_fields as $field) {
            if (
                !array_key_exists($field, $input) ||
                $input[$field] === null ||
                $input[$field] === ''
            ) {
                $this->api->respond_error(
                    ucwords(str_replace('_', ' ', $field)) . ' is required.',
                    422
                );
            }
        }

        // Prepare and validate application data first.
        $data = $this->input_application_data($input);

        // Temporary code satisfies the NOT NULL and UNIQUE constraints.
        $data['record_code'] = 'TEMP-' . bin2hex(random_bytes(12));

        $transaction_started = false;

        try {
            $this->db->transaction();
            $transaction_started = true;

            // Insert application.
            $id = $this->input_application_model->_insert($data);

            if ($id === false || !is_numeric($id) || (int) $id < 1) {
                throw new Exception('Input application insert failed.');
            }

            $id = (int) $id;

            // Generate permanent record code from inserted ID.
            $record_code = 'INPUT-' . str_pad(
                (string) $id,
                6,
                '0',
                STR_PAD_LEFT
            );

            // Update using Database::raw() directly.
            $statement = $this->db->raw(
                'UPDATE farm_input_application
                 SET record_code = ?
                 WHERE id = ?',
                [$record_code, $id]
            );

            if (!$statement || $statement->rowCount() !== 1) {
                throw new Exception(
                    'Permanent input application record code update failed.'
                );
            }

            $this->db->commit();
            $transaction_started = false;

            $this->api->respond([
                'message' => 'Input application added successfully.',
                'id' => $id,
                'record_code' => $record_code
            ], 201);

        } catch (Throwable $e) {
            if ($transaction_started) {
                $this->db->roll_back();
            }

            log_message(
                'error',
                'Farm input application creation failed: ' . $e->getMessage()
            );

            $this->api->respond_error(
                'Unable to save input application. Please try again.',
                500
            );
        }
    }

    /**
     * Update an input application.
     * Existing record_code is preserved.
     */
    public function update_input_application($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_farm_access();

        $current = $this->find_record(
            $this->input_application_model,
            $id,
            'Input application'
        );

        $input = $this->api->body();

        $data = $this->input_application_data($input, $current);

        // Do not include record_code in update data.
        $this->input_application_model->_update(
            (int) $current['id'],
            $data
        );

        $this->api->respond([
            'message' => 'Input application updated successfully.',
            'record_code' => $current['record_code']
        ]);
    }

    public function delete_input_application($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_farm_access();

        $record = $this->find_record(
            $this->input_application_model,
            $id,
            'Input application'
        );

        $this->input_application_model->_delete(
            (int) $record['id']
        );

        $this->api->respond([
            'message' => 'Input application deleted successfully.'
        ]);
    }

    // =========================================================
    // DATA PREPARATION
    // =========================================================

    private function activity_data(array $input, array $current = [])
    {
        $planting_id = $this->optional_id(
            $input,
            $current,
            'farm_planting_harvesting_id'
        );

        if ($planting_id === null) {
            $this->api->respond_error(
                'Please select a planting/harvesting record.',
                422
            );
        }

        $statement = $this->db->raw(
            'SELECT
                id,
                season,
                area_hectares,
                rice_variety
            FROM farm_planting_harvesting
            WHERE id = ?
            LIMIT 1',
            [$planting_id]
        );

        $planting = $statement->fetch(PDO::FETCH_ASSOC);

        if (!$planting) {
            $this->api->respond_error(
                'Selected planting/harvesting record does not exist.',
                422
            );
        }

        $season = trim((string) ($planting['season'] ?? ''));
        $rice_variety = trim((string) ($planting['rice_variety'] ?? ''));
        $area_hectares = (float) ($planting['area_hectares'] ?? 0);

        if ($season === '') {
            $this->api->respond_error(
                'The selected planting record has no season information.',
                422
            );
        }

        if ($area_hectares <= 0) {
            $this->api->respond_error(
                'The selected planting record has an invalid area.',
                422
            );
        }

        $activity = $this->string_value(
            $input,
            $current,
            'activity',
            'Activity',
            100,
            true
        );

        $date = $this->date_value(
            $input,
            $current,
            'date',
            'Activity date'
        );

        $notes = $this->string_value(
            $input,
            $current,
            'notes',
            'Notes',
            10000,
            false
        );

        return [
            'farm_planting_harvesting_id' => $planting_id,

            // Legacy database fields are populated from the planting record.
            'season' => $season,
            'area' => number_format($area_hectares, 2, '.', '') . ' hectares',
            'type_of_seedling' => $rice_variety !== ''
                ? $rice_variety
                : null,

            // These are now tracked in Farm Input Applications.
            'fertilizers' => null,
            'antipesticide' => null,

            'activity' => $activity,
            'date' => $date,
            'notes' => $notes,
        ];
    }

    private function inventory_data(array $input, array $current = [])
    {
        $data = [];

        $data['season_id'] = $this->validate_season_id(
            $input,
            $current
        );

        $farm_act_id = $this->optional_id(
            $input,
            $current,
            'farm_act_id'
        );

        if (
            $farm_act_id !== null &&
            !$this->record_exists('farm_act', $farm_act_id)
        ) {
            $this->api->respond_error(
                'Farm activity not found.',
                422
            );
        }

        $data['farm_act_id'] = $farm_act_id;

        $data['item_category'] = $this->string_value(
            $input, $current, 'item_category', 'Item category', 50, true
        );

        $data['item_name'] = $this->string_value(
            $input, $current, 'item_name', 'Item name', 150, true
        );

        $data['quantity'] = $this->number_value(
            $input, $current, 'quantity', 'Quantity', 0
        );

        $data['unit'] = $this->string_value(
            $input, $current, 'unit', 'Unit', 50, false
        );

        $data['unit_price'] = $this->number_value(
            $input, $current, 'unit_price', 'Unit price', 0
        );

        $data['total_cost'] = round(
            $data['quantity'] * $data['unit_price'],
            2
        );

        $data['date_acquired'] = $this->date_value(
            $input, $current, 'date_acquired', 'Date acquired'
        );

        return $data;
    }

    private function planting_data(array $input, array $current = [])
    {
        $area = $this->number_value(
            $input,
            $current,
            'area_hectares',
            'Area (hectares)',
            0
        );

        if ($area <= 0) {
            $this->api->respond_error(
                'Area must be greater than zero hectares.',
                422
            );
        }

        $planting_date = $this->date_value(
            $input,
            $current,
            'planting_date',
            'Planting date'
        );

        if ($planting_date === null) {
            $this->api->respond_error(
                'Planting date is required.',
                422
            );
        }

        $expected_harvest_date = $this->date_value(
            $input,
            $current,
            'expected_harvest_date',
            'Expected harvest date'
        );

        if (
            $expected_harvest_date !== null &&
            $expected_harvest_date < $planting_date
        ) {
            $this->api->respond_error(
                'Expected harvest date cannot be earlier than planting date.',
                422
            );
        }

        $actual_harvest_date = $this->date_value(
            $input,
            $current,
            'actual_harvest_date',
            'Actual harvest date'
        );

        if (
            $actual_harvest_date !== null &&
            $actual_harvest_date < $planting_date
        ) {
            $this->api->respond_error(
                'Actual harvest date cannot be earlier than planting date.',
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
            'Planned'
        );

        if (!in_array($status, ['Planned', 'Growing', 'Harvested'], true)) {
            $this->api->respond_error(
                'Status must be Planned, Growing, or Harvested.',
                422
            );
        }

        $harvested_yield = $this->number_value(
            $input,
            $current,
            'harvested_yield',
            'Harvested yield',
            0
        );

        if ($status === 'Harvested') {
            if ($actual_harvest_date === null) {
                $this->api->respond_error(
                    'Actual harvest date is required for harvested records.',
                    422
                );
            }

            if ($harvested_yield <= 0) {
                $this->api->respond_error(
                    'Harvested yield must be greater than zero for harvested records.',
                    422
                );
            }
        }

        return [
            'record_code' => $this->string_value(
                $input,
                $current,
                'record_code',
                'Record code',
                50,
                false
            ),

            'season' => $this->string_value(
                $input,
                $current,
                'season',
                'Season',
                100,
                false
            ),

            'field_name' => $this->string_value(
                $input,
                $current,
                'field_name',
                'Field name',
                100,
                true
            ),

            'area_hectares' => $area,

            'crop' => $this->string_value(
                $input,
                $current,
                'crop',
                'Crop',
                100,
                true,
                'Palay'
            ),

            'rice_variety' => $this->string_value(
                $input,
                $current,
                'rice_variety',
                'Rice variety',
                100,
                true
            ),

            'method' => $this->string_value(
                $input,
                $current,
                'method',
                'Planting method',
                50,
                false
            ),

            'planting_date' => $planting_date,
            'expected_harvest_date' => $expected_harvest_date,
            'actual_harvest_date' => $actual_harvest_date,
            'harvested_yield' => $harvested_yield,
            'status' => $status,
        ];
    }

    // =========================================================
    // INPUT APPLICATION DATA VALIDATION
    // =========================================================

    private function input_application_data(array $input, array $current = [])
    {
        $planting_id = $this->optional_id(
            $input,
            $current,
            'farm_planting_harvesting_id'
        );

        if ($planting_id === null) {
            $this->api->respond_error(
                'Planting/harvesting record is required.',
                422
            );
        }

        if (!$this->record_exists('farm_planting_harvesting', $planting_id)) {
            $this->api->respond_error(
                'Planting/harvesting record not found.',
                422
            );
        }

        // OPTIONAL FARM ACTIVITY
        $farm_act_id = $this->optional_id(
            $input,
            $current,
            'farm_act_id'
        );

        if ($farm_act_id !== null) {
            $statement = $this->db->raw(
                'SELECT id
                 FROM farm_act
                 WHERE id = ?
                   AND farm_planting_harvesting_id = ?
                 LIMIT 1',
                [$farm_act_id, $planting_id]
            );

            if ($statement->fetchColumn() === false) {
                $this->api->respond_error(
                    'The selected farm activity does not belong to this planting/harvesting record.',
                    422
                );
            }
        }

        // INPUT CATEGORY
        $category = $this->string_value(
            $input,
            $current,
            'input_category',
            'Input category',
            50,
            true
        );

        $category = strtoupper($category);

        if (!in_array($category, ['NPK', 'OTHER', 'PESTICIDE'], true)) {
            $this->api->respond_error(
                'Input category must be NPK, OTHER, or PESTICIDE.',
                422
            );
        }

        // QUANTITY
        $quantity = $this->number_value(
            $input,
            $current,
            'quantity',
            'Quantity',
            0
        );

        if ($quantity <= 0) {
            $this->api->respond_error(
                'Application quantity must be greater than zero.',
                422
            );
        }

        // UNIT VALIDATION
        $unit_input = $this->string_value(
            $input,
            $current,
            'unit',
            'Unit',
            30,
            true
        );

        $normalized_unit = strtolower(trim($unit_input));

        if (in_array($category, ['NPK', 'OTHER'], true)) {
            if ($normalized_unit !== 'kg') {
                $this->api->respond_error(
                    $category . ' fertilizer must use kilograms (kg).',
                    422
                );
            }

            $unit = 'kg';
        } else {
            if (!in_array($normalized_unit, ['ml', 'l'], true)) {
                $this->api->respond_error(
                    'Pesticide must use milliliters (mL) or liters (L).',
                    422
                );
            }

            $unit = $normalized_unit === 'ml' ? 'mL' : 'L';
        }

        // APPLICATION DATE
        $application_date = $this->date_value(
            $input,
            $current,
            'application_date',
            'Application date'
        );

        if ($application_date === null) {
            $this->api->respond_error(
                'Application date is required.',
                422
            );
        }

        return [
            'farm_planting_harvesting_id' => $planting_id,
            'farm_act_id' => $farm_act_id,
            'input_category' => $category,

            'input_name' => $this->string_value(
                $input,
                $current,
                'input_name',
                'Input name',
                150,
                true
            ),

            'quantity' => $quantity,
            'unit' => $unit,
            'application_date' => $application_date,

            'notes' => $this->string_value(
                $input,
                $current,
                'notes',
                'Notes',
                10000,
                false
            ),
        ];
    }

    // =========================================================
    // VALIDATION HELPERS
    // =========================================================

    private function find_record($model, $id, $label)
    {
        $id = $this->validate_record_id($id);

        $record = $model->_find($id);

        if (!$record) {
            $this->api->respond_error(
                $label . ' not found.',
                404
            );
        }

        return $record;
    }

    private function validate_record_id($id)
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

        return (int) $id;
    }

    /**
     * Checks that every expected key is present.
     * Null values are allowed here because some fields are optional.
     * Actual required-value validation is handled by the data methods.
     */
    private function require_fields(array $input, array $fields)
    {
        foreach ($fields as $field) {
            if (!array_key_exists($field, $input)) {
                $this->api->respond_error(
                    ucwords(str_replace('_', ' ', $field)) .
                    ' field is missing.',
                    422
                );
            }
        }
    }

    private function string_value(
        array $input,
        array $current,
        $key,
        $label,
        $max_length,
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
            strlen($value) > $max_length ||
            ($required && trim($value) === '')
        ) {
            $this->api->respond_error(
                $label . ' must be a non-empty value of at most ' .
                $max_length . ' characters.',
                422
            );
        }

        return trim($value);
    }

    private function date_value(array $input, array $current, $key, $label)
    {
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
        $default
    ) {
        $value = array_key_exists($key, $input)
            ? $input[$key]
            : ($current[$key] ?? $default);

        if (
            !is_numeric($value) ||
            !is_finite((float) $value) ||
            (float) $value < 0 ||
            (float) $value > 99999999.99
        ) {
            $this->api->respond_error(
                $label . ' must be between 0 and 99999999.99.',
                422
            );
        }

        return round((float) $value, 2);
    }

    private function optional_id(array $input, array $current, $key)
    {
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

        return (int) $value;
    }

    private function validate_season_id($input, $current = [])
    {
        $value = $input['season_id'] ?? ($current['season_id'] ?? null);

        if ($value === null || $value === '') {
            return null;
        }

        if (!is_string($value) || strlen($value) > 50) {
            $this->api->respond_error(
                'Invalid season ID.',
                422
            );
        }

        $statement = $this->db->raw(
            'SELECT season_id
             FROM seasons
             WHERE season_id = ?
             LIMIT 1',
            [$value]
        );

        if ($statement->fetchColumn() === false) {
            $this->api->respond_error(
                'Selected season does not exist.',
                422
            );
        }

        return $value;
    }

    private function record_exists($table, $id)
    {
        $allowed_tables = [
            'farm_planting_harvesting',
            'farm_act',
        ];

        if (!in_array($table, $allowed_tables, true)) {
            return false;
        }

        $statement = $this->db->raw(
            "SELECT id FROM {$table} WHERE id = ? LIMIT 1",
            [$id]
        );

        return $statement->fetchColumn() !== false;
    }

    // =========================================================
    // FARM AUTHORIZATION
    // =========================================================

    private function authorize_farm_access()
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
                $user['section'] === 'farm'
            )
        ) {
            $this->api->respond_error(
                'You are not authorized to access the farm section.',
                403
            );
        }
    }
}
