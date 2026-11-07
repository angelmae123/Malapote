<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class OfficeController extends Controller
{
    private $farmers_model;
    private $payroll_model;
    private $api;
    private $db;

    public function __construct()
    {
        parent::__construct();

        $this->db = $this->call->database();
        $this->farmers_model = $this->call->model('FarmersModel');
        $this->payroll_model = $this->call->model('PayrollModels');
        $this->api = $this->call->library('api');
    }

    // =========================================================
    // FARMERS & WORKERS
    // =========================================================

    public function farmers_workers()
    {
        $this->api->require_method('GET');
        $this->api->rate_limit('office_farmers_workers', 120, 60);
        $this->authorize_office_access();

        $this->api->respond($this->farmers_model->_all());
    }

    public function farmer_worker($id)
    {
        $this->api->require_method('GET');
        $this->authorize_office_access();

        $this->api->respond($this->find_farmer_worker($id));
    }

    public function add_farmer_worker()
    {
        $this->api->require_method('POST');
        $this->api->rate_limit('office_add_farmer_worker', 30, 60);
        $this->authorize_office_access();

        $input = $this->api->body();

        $this->require_fields($input);

        $id = $this->farmers_model->_insert(
            $this->farmer_worker_data($input)
        );

        if ($id === false) {
            $this->api->respond_error(
                'Unable to add farmer/worker.',
                500
            );
        }

        $this->api->respond([
            'message' => 'Farmer/worker added successfully.',
            'id' => $id
        ], 201);
    }

    public function update_farmer_worker($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_office_access();

        $current = $this->find_farmer_worker($id);
        $input = $this->api->body();

        $this->require_fields($input);

        $result = $this->farmers_model->_update(
            (int) $current['id'],
            $this->farmer_worker_data($input, $current)
        );

        if ($result === false) {
            $this->api->respond_error(
                'Unable to update farmer/worker.',
                500
            );
        }

        $this->api->respond([
            'message' => 'Farmer/worker updated successfully.'
        ]);
    }

    public function delete_farmer_worker($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_office_access();

        $record = $this->find_farmer_worker($id);

        $result = $this->farmers_model->_delete((int) $record['id']);

        if ($result === false) {
            $this->api->respond_error(
                'Unable to delete farmer/worker.',
                500
            );
        }

        $this->api->respond([
            'message' => 'Farmer/worker deleted successfully.'
        ]);
    }

    // =========================================================
    // PAYROLL PERIODS
    // =========================================================

    /**
     * Get all monthly payroll periods.
     *
     * GET: api/office/payroll-periods
     */
    public function payroll_periods()
    {
        $this->api->require_method('GET');
        $this->api->rate_limit('office_payroll_periods', 120, 60);
        $this->authorize_office_access();

        $statement = $this->db->raw(
            'SELECT
                pp.id,
                pp.period_month,
                pp.period_year,
                pp.payroll_date,
                pp.status,
                pp.created_at,
                pp.updated_at,
                COUNT(p.id) AS payroll_count,
                COALESCE(SUM(p.gross), 0) AS total_gross,
                COALESCE(SUM(p.advance), 0) AS total_advance,
                COALESCE(SUM(p.net), 0) AS total_net
            FROM payroll_periods pp
            LEFT JOIN payroll p
                ON p.payroll_period_id = pp.id
            GROUP BY
                pp.id,
                pp.period_month,
                pp.period_year,
                pp.payroll_date,
                pp.status,
                pp.created_at,
                pp.updated_at
            ORDER BY
                pp.period_year DESC,
                pp.period_month DESC,
                pp.id DESC'
        );

        $periods = $statement->fetchAll(PDO::FETCH_ASSOC);

        $this->api->respond($periods);
    }

    /**
     * Get the current month's payroll period.
     *
     * Creates a period automatically if it does not exist.
     */
    public function current_payroll_period()
    {
        $this->api->require_method('GET');
        $this->authorize_office_access();

        $period = $this->get_or_create_current_period();

        $this->api->respond($period);
    }

    /**
     * Find or create the current month's payroll period.
     *
     * Existing Closed periods are never automatically reopened.
     */
    private function get_or_create_current_period()
    {
        $month = (int) date('n');
        $year = (int) date('Y');

        $statement = $this->db->raw(
            'SELECT *
             FROM payroll_periods
             WHERE period_month = ?
               AND period_year = ?
             LIMIT 1',
            [$month, $year]
        );

        $period = $statement->fetch(PDO::FETCH_ASSOC);

        if ($period) {
            return $period;
        }

        /*
         * Create only when the current month/year does not exist.
         * Do not update or reopen an existing Closed period.
         */
        $this->db->raw(
            "INSERT INTO payroll_periods
                (
                    period_month,
                    period_year,
                    payroll_date,
                    status,
                    created_at,
                    updated_at
                )
             VALUES
                (?, ?, CURDATE(), 'Open', NOW(), NOW())",
            [$month, $year]
        );

        $statement = $this->db->raw(
            'SELECT *
             FROM payroll_periods
             WHERE period_month = ?
               AND period_year = ?
             LIMIT 1',
            [$month, $year]
        );

        $period = $statement->fetch(PDO::FETCH_ASSOC);

        if (!$period) {
            $this->api->respond_error(
                'Unable to create the current payroll period.',
                500
            );
        }

        return $period;
    }

    /**
     * Validate that a payroll period exists and is Open.
     */
    private function require_open_payroll_period($period_id)
    {
        $statement = $this->db->raw(
            'SELECT
                id,
                period_month,
                period_year,
                payroll_date,
                status
             FROM payroll_periods
             WHERE id = ?
             LIMIT 1',
            [(int) $period_id]
        );

        $period = $statement->fetch(PDO::FETCH_ASSOC);

        if (!$period) {
            $this->api->respond_error(
                'Payroll period not found.',
                404
            );
        }

        if ($period['status'] !== 'Open') {
            $this->api->respond_error(
                'This payroll period is already closed. Editing and deleting are not allowed.',
                409
            );
        }

        return $period;
    }

    /**
     * Check the period assigned to an existing payroll record.
     */
    private function require_payroll_record_open(array $record)
    {
        $period_id = $record['payroll_period_id'] ?? null;

        if (
            $period_id === null ||
            $period_id === '' ||
            (int) $period_id < 1
        ) {
            $this->api->respond_error(
                'This payroll record has no assigned monthly period. Please review its payroll_period_id before editing or deleting it.',
                409
            );
        }

        $this->require_open_payroll_period($period_id);
    }

    // =========================================================
    // PAYROLL RECORDS
    // =========================================================

    /**
     * Get all payroll records with their monthly period details.
     *
     * GET: api/office/payroll
     */
    public function payroll()
    {
        $this->api->require_method('GET');
        $this->api->rate_limit('office_payroll', 120, 60);
        $this->authorize_office_access();

        $statement = $this->db->raw(
            'SELECT
                p.*,
                pp.period_month,
                pp.period_year,
                pp.status AS period_status
             FROM payroll p
             LEFT JOIN payroll_periods pp
                ON pp.id = p.payroll_period_id
             ORDER BY
                p.created_at DESC,
                p.id DESC'
        );

        $records = $statement->fetchAll(PDO::FETCH_ASSOC);

        $this->api->respond($records);
    }

    /**
     * Get one payroll record.
     *
     * GET: api/office/payroll/{id}
     */
    public function payroll_record($id)
    {
        $this->api->require_method('GET');
        $this->authorize_office_access();

        $record = $this->find_payroll_record($id);

        $statement = $this->db->raw(
            'SELECT
                p.*,
                pp.period_month,
                pp.period_year,
                pp.status AS period_status
             FROM payroll p
             LEFT JOIN payroll_periods pp
                ON pp.id = p.payroll_period_id
             WHERE p.id = ?
             LIMIT 1',
            [(int) $record['id']]
        );

        $result = $statement->fetch(PDO::FETCH_ASSOC);

        if (!$result) {
            $this->api->respond_error(
                'Payroll record not found.',
                404
            );
        }

        $this->api->respond($result);
    }

    /**
     * Add a payroll record to the current month's Open period.
     */
    public function add_payroll()
    {
        $this->api->require_method('POST');
        $this->api->rate_limit('office_add_payroll', 30, 60);
        $this->authorize_office_access();

        $input = $this->api->body();

        $this->require_payroll_fields($input, true);

        $payroll_code = $input['payroll_id'] ?? '';

        if (
            !is_string($payroll_code) ||
            !preg_match('/^PAY-[0-9]{14}$/', $payroll_code)
        ) {
            $this->api->respond_error(
                'Invalid payroll code. Please reopen the Add Payroll form.',
                422
            );
        }

        // Check duplicate payroll code.
        $statement = $this->db->raw(
            'SELECT id
             FROM payroll
             WHERE payroll_id = ?
             LIMIT 1',
            [$payroll_code]
        );

        $existing = $statement->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $this->api->respond_error(
                'This payroll code already exists. Please reopen the Add Payroll form to generate another code.',
                409
            );
        }

        // Get or create the current month's period.
        $period = $this->get_or_create_current_period();

        // Do not add payroll to a Closed period.
        if ($period['status'] !== 'Open') {
            $this->api->respond_error(
                'The current monthly payroll period is closed. New payroll records cannot be added.',
                409
            );
        }

        $data = $this->payroll_data($input);

        // Automatically assign the current month's period.
        $data['payroll_period_id'] = (int) $period['id'];

        $id = $this->payroll_model->_insert($data);

        if ($id === false) {
            $this->api->respond_error(
                'Unable to add payroll record.',
                500
            );
        }

        $this->api->respond([
            'message' => 'Payroll record added successfully.',
            'id' => $id,
            'payroll_id' => $data['payroll_id'],
            'payroll_period_id' => $data['payroll_period_id'],
            'period_month' => (int) $period['period_month'],
            'period_year' => (int) $period['period_year']
        ], 201);
    }

    /**
     * Update a payroll record only if its assigned period is Open.
     */
    public function update_payroll($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_office_access();

        $current = $this->find_payroll_record($id);

        // Block editing if unassigned or period is Closed.
        $this->require_payroll_record_open($current);

        $input = $this->api->body();

        $this->require_payroll_fields($input, false);

        // Never change the original payroll code.
        $input['payroll_id'] = $current['payroll_id'];

        $data = $this->payroll_data($input, $current);

        // Always preserve the original monthly period.
        $data['payroll_period_id'] = (int) $current['payroll_period_id'];

        $result = $this->payroll_model->_update(
            (int) $current['id'],
            $data
        );

        if ($result === false) {
            $this->api->respond_error(
                'Unable to update payroll record.',
                500
            );
        }

        $this->api->respond([
            'message' => 'Payroll record updated successfully.',
            'payroll_id' => $data['payroll_id'],
            'payroll_period_id' => $data['payroll_period_id']
        ]);
    }

    /**
     * Delete a payroll record only if its assigned period is Open.
     */
    public function delete_payroll($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_office_access();

        $record = $this->find_payroll_record($id);

        // Block deletion if unassigned or period is Closed.
        $this->require_payroll_record_open($record);

        $result = $this->payroll_model->_delete(
            (int) $record['id']
        );

        if ($result === false) {
            $this->api->respond_error(
                'Unable to delete payroll record.',
                500
            );
        }

        $this->api->respond([
            'message' => 'Payroll record deleted successfully.'
        ]);
    }

    // =========================================================
    // FARMER / WORKER DATA
    // =========================================================

    private function farmer_worker_data(
        array $input,
        array $current = []
    ) {
        return [
            'name' => $this->string_value(
                $input,
                $current,
                'name',
                'Name',
                150,
                true
            ),
            'role' => $this->string_value(
                $input,
                $current,
                'role',
                'Role',
                50,
                false
            ),
            'contact_no' => $this->string_value(
                $input,
                $current,
                'contact_no',
                'Contact number',
                50,
                false
            ),
            'days_of_work' => $this->days_of_work_value(
                $input,
                $current
            ),
            'season' => $this->string_value(
                $input,
                $current,
                'season',
                'Season',
                100,
                false
            ),
        ];
    }

    // =========================================================
    // PAYROLL DATA
    // =========================================================

    private function payroll_data(
        array $input,
        array $current = []
    ) {
        $payroll_id = $this->payroll_string_value(
            $input,
            $current,
            'payroll_id',
            'Payroll ID',
            50,
            true,
            null
        );

        $farmer_worker_id = $this->payroll_farmer_worker_id(
            $input,
            $current
        );

        if ($farmer_worker_id === null) {
            $this->api->respond_error(
                'Please select an existing farmer or worker.',
                422
            );
        }

        $worker = $this->find_farmer_worker($farmer_worker_id);

        $worker_name = trim($worker['name'] ?? '');

        if ($worker_name === '') {
            $this->api->respond_error(
                'The selected farmer/worker has no valid name.',
                422
            );
        }

        $employment_type = $this->payroll_string_value(
            $input,
            $current,
            'employment_type',
            'Employment type',
            50,
            true,
            'Daily'
        );

        $rate = $this->payroll_number_value(
            $input,
            $current,
            'rate',
            'Rate',
            99999999.99,
            2,
            0
        );

        $days = $this->payroll_number_value(
            $input,
            $current,
            'days',
            'Days',
            9999.9,
            1,
            0
        );

        // Automatically calculate gross pay.
        $gross = round($rate * $days, 2);

        if ($gross > 99999999.99) {
            $this->api->respond_error(
                'Calculated gross pay exceeds the supported amount.',
                422
            );
        }

        $advance = $this->payroll_number_value(
            $input,
            $current,
            'advance',
            'Advance',
            99999999.99,
            2,
            0
        );

        if ($advance > $gross) {
            $this->api->respond_error(
                'Advance cannot be greater than gross pay.',
                422
            );
        }

        $status = $this->payroll_string_value(
            $input,
            $current,
            'status',
            'Status',
            50,
            true,
            'Pending'
        );

        if (!in_array($status, ['Pending', 'Released'], true)) {
            $this->api->respond_error(
                'Status must be Pending or Released.',
                422
            );
        }

        return [
            'payroll_id' => $payroll_id,
            'farmers_workers_id' => $farmer_worker_id,

            // Keep the worker name snapshot in the payroll record.
            'worker_name' => $worker_name,

            'employment_type' => $employment_type,
            'rate' => $rate,
            'days' => $days,
            'gross' => $gross,
            'advance' => $advance,
            'net' => round($gross - $advance, 2),
            'status' => $status,
        ];
    }

    // =========================================================
    // PAYROLL VALIDATION
    // =========================================================

    private function require_payroll_fields(
        array $input,
        $is_add = false
    ) {
        /*
         * For new records, these two fields must always be supplied.
         * Other payroll values have validated defaults.
         */
        if ($is_add) {
            $required = [
                'payroll_id',
                'farmers_workers_id'
            ];

            foreach ($required as $field) {
                if (
                    !array_key_exists($field, $input) ||
                    $input[$field] === null ||
                    $input[$field] === ''
                ) {
                    $this->api->respond_error(
                        ucfirst(str_replace('_', ' ', $field)) . ' is required.',
                        422
                    );
                }
            }

            return;
        }

        $fields = [
            'farmers_workers_id',
            'employment_type',
            'rate',
            'days',
            'advance',
            'status'
        ];

        if (!array_intersect($fields, array_keys($input))) {
            $this->api->respond_error(
                'At least one supported payroll field is required.',
                422
            );
        }
    }

    private function payroll_farmer_worker_id(
        array $input,
        array $current
    ) {
        $value = array_key_exists('farmers_workers_id', $input)
            ? $input['farmers_workers_id']
            : ($current['farmers_workers_id'] ?? null);

        if (
            $value === null ||
            $value === '' ||
            (!is_string($value) && !is_int($value)) ||
            !ctype_digit((string) $value) ||
            (int) $value < 1
        ) {
            $this->api->respond_error(
                'A valid farmer/worker selection is required.',
                422
            );
        }

        return (int) $value;
    }

    private function payroll_string_value(
        array $input,
        array $current,
        $key,
        $label,
        $max_length,
        $required,
        $default
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
            trim($value) === ''
        ) {
            $this->api->respond_error(
                $label . ' must be a non-empty value of at most ' .
                $max_length . ' characters.',
                422
            );
        }

        return trim($value);
    }

    private function payroll_number_value(
        array $input,
        array $current,
        $key,
        $label,
        $maximum,
        $precision,
        $default
    ) {
        $value = array_key_exists($key, $input)
            ? $input[$key]
            : ($current[$key] ?? $default);

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

        return round((float) $value, $precision);
    }

    // =========================================================
    // FIND RECORDS
    // =========================================================

    private function find_payroll_record($id)
    {
        if (
            !is_scalar($id) ||
            !ctype_digit((string) $id) ||
            (int) $id < 1
        ) {
            $this->api->respond_error(
                'A valid payroll record ID is required.',
                422
            );
        }

        $record = $this->payroll_model->_find((int) $id);

        if (!$record) {
            $this->api->respond_error(
                'Payroll record not found.',
                404
            );
        }

        return $record;
    }

    private function find_farmer_worker($id)
    {
        if (
            !is_scalar($id) ||
            !ctype_digit((string) $id) ||
            (int) $id < 1
        ) {
            $this->api->respond_error(
                'A valid farmer/worker ID is required.',
                422
            );
        }

        $record = $this->farmers_model->_find((int) $id);

        if (!$record) {
            $this->api->respond_error(
                'Farmer/worker not found.',
                404
            );
        }

        return $record;
    }

    // =========================================================
    // FARMER / WORKER VALIDATION
    // =========================================================

    private function require_fields(array $input)
    {
        $fields = [
            'name',
            'role',
            'contact_no',
            'days_of_work'
        ];

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
        $max_length,
        $required
    ) {
        $value = array_key_exists($key, $input)
            ? $input[$key]
            : ($current[$key] ?? null);

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

    private function days_of_work_value(
        array $input,
        array $current
    ) {
        $value = array_key_exists('days_of_work', $input)
            ? $input['days_of_work']
            : ($current['days_of_work'] ?? 0);

        if (
            !is_numeric($value) ||
            !is_finite((float) $value) ||
            (float) $value < 0 ||
            (float) $value > 999.9
        ) {
            $this->api->respond_error(
                'Days of work must be between 0 and 999.9.',
                422
            );
        }

        return round((float) $value, 1);
    }

    // =========================================================
    // OFFICE AUTHORIZATION
    // =========================================================

    private function authorize_office_access()
    {
        $claims = $this->api->require_jwt();

        if (
            !isset($claims['sub']) ||
            !is_scalar($claims['sub']) ||
            (string) $claims['sub'] === ''
        ) {
            $this->api->respond_error(
                'Invalid authentication token.',
                401
            );
        }

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
                $user['section'] === 'office'
            )
        ) {
            $this->api->respond_error(
                'You are not authorized to access the office section.',
                403
            );
        }
    }
}
