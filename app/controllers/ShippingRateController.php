
<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class ShippingRateController extends Controller
{
    private $api;
    private $db;
    private $shipping_rate;

    public function __construct()
    {
        parent::__construct();

        $this->api = $this->call->library('api');
        $this->db = $this->call->database();
        $this->shipping_rate = $this->call->model('ShippingRateModel');
    }

    /**
     * Require an administrator role for shipping-rate management.
     */
    private function authorizeAdmin()
    {
        $auth = $this->api->require_jwt();

        $statement = $this->db->raw(
            'SELECT role, section, is_active FROM users WHERE id = ? LIMIT 1',
            [$auth['sub']]
        );
        $user = $statement->fetch(PDO::FETCH_ASSOC);

        if (!$user || !(int) $user['is_active']) {
            $this->api->respond_error('Unauthorized.', 401);
        }

        $role = strtolower(trim($user['role'] ?? ''));
        $isAdministrator = in_array(
            $role,
            ['super_admin', 'admin', 'administrator'],
            true
        );
        $isSalesAdmin = $role === 'section_admin'
            && strtolower(trim($user['section'] ?? '')) === 'sales';

        if (!$isAdministrator && !$isSalesAdmin) {
            $this->api->respond_error(
                'Administrator access required.',
                403
            );
        }

        return $auth;
    }

    /**
     * Validate and normalize shipping rate input.
     */
    private function validateRate($input)
    {
        $municipality = trim($input['municipality'] ?? '');
        $barangay = trim($input['barangay'] ?? '');

        $minSacks = filter_var(
            $input['min_sacks'] ?? null,
            FILTER_VALIDATE_INT
        );

        $maxInput = $input['max_sacks'] ?? null;
        $maxSacks = null;

        if ($maxInput !== null && $maxInput !== '') {
            $maxSacks = filter_var(
                $maxInput,
                FILTER_VALIDATE_INT
            );
        }

        $shippingFee = filter_var(
            $input['shipping_fee'] ?? null,
            FILTER_VALIDATE_FLOAT
        );

        $status = ucfirst(
            strtolower(trim($input['status'] ?? 'Active'))
        );

        if ($municipality === '') {
            $this->api->respond_error(
                'Municipality is required.',
                422
            );
        }

        if ($minSacks === false || $minSacks < 1) {
            $this->api->respond_error(
                'Minimum sacks must be at least 1.',
                422
            );
        }

        if (
            $maxSacks === false ||
            ($maxSacks !== null && $maxSacks < $minSacks)
        ) {
            $this->api->respond_error(
                'Maximum sacks must be greater than or equal to minimum sacks.',
                422
            );
        }

        if ($shippingFee === false || $shippingFee < 0) {
            $this->api->respond_error(
                'Shipping fee must be a valid non-negative amount.',
                422
            );
        }

        if (!in_array($status, ['Active', 'Inactive'], true)) {
            $this->api->respond_error(
                'Invalid shipping rate status.',
                422
            );
        }

        return [
            'municipality' => $municipality,
            'barangay' => $barangay !== '' ? $barangay : null,
            'min_sacks' => $minSacks,
            'max_sacks' => $maxSacks,
            'shipping_fee' => number_format($shippingFee, 2, '.', ''),
            'status' => $status,
        ];
    }

    /**
     * GET /api/shipping-rates
     * Retrieve all shipping rates.
     */
    public function index()
    {
        $this->api->require_method('GET');
        $this->authorizeAdmin();

        $rates = $this->shipping_rate->order_by('municipality', 'ASC');

        $this->api->respond([
            'success' => true,
            'data' => $rates ?: [],
        ]);
    }

    /**
     * GET /api/shipping-rates/{id}
     * Retrieve one shipping rate.
     */
    public function show($id)
    {
        $this->api->require_method('GET');
        $this->authorizeAdmin();

        $id = (int) $id;

        if ($id <= 0) {
            $this->api->respond_error(
                'Invalid shipping rate ID.',
                422
            );
        }

        $rate = $this->shipping_rate->find($id);

        if (!$rate) {
            $this->api->respond_error(
                'Shipping rate not found.',
                404
            );
        }

        $this->api->respond([
            'success' => true,
            'data' => $rate,
        ]);
    }

    /**
     * POST /api/shipping-rates
     * Create a shipping rate.
     */
    public function store()
    {
        $this->api->require_method('POST');
        $this->authorizeAdmin();

        $input = $this->api->body();
        $data = $this->validateRate($input);

        $id = $this->shipping_rate->insert($data);

        if (!$id) {
            $this->api->respond_error(
                'Failed to create shipping rate.',
                500
            );
        }

        $createdRate = $this->shipping_rate->find($id);

        $this->api->respond([
            'success' => true,
            'message' => 'Shipping rate created successfully.',
            'data' => $createdRate,
        ], 201);
    }

    /**
     * PUT /api/shipping-rates/{id}
     * Update a shipping rate.
     */
    public function update($id)
    {
        $this->api->require_method('PUT');
        $this->authorizeAdmin();

        $id = (int) $id;

        if ($id <= 0) {
            $this->api->respond_error(
                'Invalid shipping rate ID.',
                422
            );
        }

        $existing = $this->shipping_rate->find($id);

        if (!$existing) {
            $this->api->respond_error(
                'Shipping rate not found.',
                404
            );
        }

        $input = $this->api->body();

        $existing = (array) $existing;

        $mergedInput = [
            'municipality' => $input['municipality'] ?? $existing['municipality'],
            'barangay' => array_key_exists('barangay', $input)
                ? $input['barangay']
                : ($existing['barangay'] ?? ''),
            'min_sacks' => $input['min_sacks'] ?? $existing['min_sacks'],
            'max_sacks' => array_key_exists('max_sacks', $input)
                ? $input['max_sacks']
                : ($existing['max_sacks'] ?? null),
            'shipping_fee' => $input['shipping_fee'] ?? $existing['shipping_fee'],
            'status' => $input['status'] ?? $existing['status'],
        ];

        $data = $this->validateRate($mergedInput);

        $updated = $this->shipping_rate->update($id, $data);

        if ($updated === false) {
            $this->api->respond_error(
                'Failed to update shipping rate.',
                500
            );
        }

        $updatedRate = $this->shipping_rate->find($id);

        $this->api->respond([
            'success' => true,
            'message' => 'Shipping rate updated successfully.',
            'data' => $updatedRate,
        ]);
    }

    /**
     * DELETE /api/shipping-rates/{id}
     * Delete a shipping rate.
     */
    public function delete($id)
    {
        $this->api->require_method('DELETE');
        $this->authorizeAdmin();

        $id = (int) $id;

        if ($id <= 0) {
            $this->api->respond_error(
                'Invalid shipping rate ID.',
                422
            );
        }

        $existing = $this->shipping_rate->find($id);

        if (!$existing) {
            $this->api->respond_error(
                'Shipping rate not found.',
                404
            );
        }

        $deleted = $this->shipping_rate->delete($id);

        if ($deleted === false) {
            $this->api->respond_error(
                'Failed to delete shipping rate.',
                500
            );
        }

        $this->api->respond([
            'success' => true,
            'message' => 'Shipping rate deleted successfully.',
        ]);
    }
}
