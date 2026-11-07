
<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class SalesController extends Controller
{
    private $models = [];
    private $api;
    private $db;

    public function __construct()
    {
        parent::__construct();

        $this->db = $this->call->database();

        $this->models = [
            'orders' => $this->call->model('OrdersModel'),
            'sales' => $this->call->model('SalesModel'),
            'products' => $this->call->model('ProductsModel'),
            'reports' => $this->call->model('ReportsModel'),
        ];

        $this->api = $this->call->library('api');
    }

    /*
    |--------------------------------------------------------------------------
    | ORDERS
    |--------------------------------------------------------------------------
    */

    public function orders()
    {
        $this->api->require_method('GET');
        $this->authorize_sales_access();

        $this->api->respond($this->models['orders']->_all());
    }

    public function order($id)
    {
        $this->api->require_method('GET');
        $this->authorize_sales_access();

        $this->api->respond($this->find_record('orders', $id));
    }

    public function add_order()
    {
        $this->api->require_method('POST');
        $this->authorize_sales_access();

        $input = $this->api->body();

        $this->require_fields($input, [
            'order_code',
            'mill_inventory_id',
            'customer_name',
            'items_ordered',
            'payment_method',
            'order_date',
            'total_amount',
            'status'
        ]);

        $id = $this->models['orders']->_insert(
            $this->order_data($input)
        );

        $this->created_response($id, 'Order');
    }

    public function update_order($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_sales_access();

        $current = $this->find_record('orders', $id);
        $input = $this->api->body();

        $this->require_fields($input, [
            'order_code',
            'mill_inventory_id',
            'customer_name',
            'items_ordered',
            'payment_method',
            'order_date',
            'total_amount',
            'status'
        ]);

        $this->models['orders']->_update(
            (int) $current['id'],
            $this->order_data($input, $current)
        );

        $this->api->respond([
            'message' => 'Order updated successfully.'
        ]);
    }

    public function delete_order($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_sales_access();

        $record = $this->find_record('orders', $id);

        $this->models['orders']->_delete((int) $record['id']);

        $this->api->respond([
            'message' => 'Order deleted successfully.'
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | SALES TRANSACTIONS
    |--------------------------------------------------------------------------
    */

    public function transactions()
    {
        $this->api->require_method('GET');
        $this->authorize_sales_access();

        $this->api->respond($this->models['sales']->_all());
    }

    public function transaction($id)
    {
        $this->api->require_method('GET');
        $this->authorize_sales_access();

        $this->api->respond($this->find_record('sales', $id));
    }

    public function add_transaction()
    {
        $this->api->require_method('POST');
        $this->authorize_sales_access();

        $input = $this->api->body();

        $this->require_fields($input, [
            'transaction_code',
            'orders_id',
            'mill_inventory_id',
            'customer_name',
            'product_name',
            'payment_method',
            'sale_date',
            'amount',
            'status'
        ]);

        $id = $this->models['sales']->_insert(
            $this->transaction_data($input)
        );

        $this->created_response($id, 'Sales transaction');
    }

    public function update_transaction($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_sales_access();

        $current = $this->find_record('sales', $id);
        $input = $this->api->body();

        $this->require_fields($input, [
            'transaction_code',
            'orders_id',
            'mill_inventory_id',
            'customer_name',
            'product_name',
            'payment_method',
            'sale_date',
            'amount',
            'status'
        ]);

        $this->models['sales']->_update(
            (int) $current['id'],
            $this->transaction_data($input, $current)
        );

        $this->api->respond([
            'message' => 'Sales transaction updated successfully.'
        ]);
    }

    public function delete_transaction($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_sales_access();

        $record = $this->find_record('sales', $id);

        $this->models['sales']->_delete((int) $record['id']);

        $this->api->respond([
            'message' => 'Sales transaction deleted successfully.'
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | PRODUCTS
    |--------------------------------------------------------------------------
    */

    public function products()
    {
        $this->api->require_method('GET');
        $this->authorize_sales_access();

        $statement = $this->db->raw(
            'SELECT
                p.*,
                mi.item_name AS inventory_item_name,
                mi.variety AS inventory_variety,
                mi.category AS inventory_category,
                COALESCE(mi.stock_quantity, 0) AS available_stock,
                COALESCE(mi.sack_quantity, 0) AS available_sacks
             FROM products p
             LEFT JOIN mill_inventory mi
                ON mi.id = p.mill_inventory_id
             ORDER BY p.id DESC'
        );

        $products = $statement->fetchAll(PDO::FETCH_ASSOC);

        $this->api->respond($products);
    }

    public function product($id)
    {
        $this->api->require_method('GET');
        $this->authorize_sales_access();

        $this->find_record('products', $id);

        $statement = $this->db->raw(
            'SELECT
                p.*,
                mi.item_name AS inventory_item_name,
                mi.variety AS inventory_variety,
                mi.category AS inventory_category,
                COALESCE(mi.stock_quantity, 0) AS available_stock,
                COALESCE(mi.sack_quantity, 0) AS available_sacks
             FROM products p
             LEFT JOIN mill_inventory mi
                ON mi.id = p.mill_inventory_id
             WHERE p.id = ?
             LIMIT 1',
            [(int) $id]
        );

        $product = $statement->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            $this->api->respond_error('Product not found.', 404);
        }

        $this->api->respond($product);
    }

    public function add_product()
    {
        $this->api->require_method('POST');
        $this->authorize_sales_access();

        $input = $this->api->body();

        $this->require_fields($input, [
            'mill_inventory_id',
            'product_name',
            'sack_size_kg',
            'price'
        ]);

        $id = $this->models['products']->_insert(
            $this->product_data($input)
        );

        $this->created_response($id, 'Product');
    }

    public function update_product($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_sales_access();

        $current = $this->find_record('products', $id);
        $input = $this->api->body();

        $this->require_fields($input, [
            'mill_inventory_id',
            'product_name',
            'sack_size_kg',
            'price'
        ]);

        $this->models['products']->_update(
            (int) $current['id'],
            $this->product_data($input, $current)
        );

        $this->api->respond([
            'message' => 'Product updated successfully.'
        ]);
    }

    public function delete_product($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_sales_access();

        $record = $this->find_record('products', $id);

        $this->models['products']->_delete((int) $record['id']);

        $this->api->respond([
            'message' => 'Product deleted successfully.'
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | WEEKLY REPORTS
    |--------------------------------------------------------------------------
    */

    /**
     * Get all saved weekly reports.
     */
    public function reports()
    {
        $this->api->require_method('GET');
        $this->authorize_sales_access();

        $this->api->respond($this->models['reports']->_all());
    }

    /**
     * Get one weekly report.
     */
    public function report($id)
    {
        $this->api->require_method('GET');
        $this->authorize_sales_access();

        $this->api->respond($this->find_record('reports', $id));
    }

    /**
     * Preview automatically computed totals before saving.
     *
     * POST sales/reports/preview
     * Body:
     * {
     *     "start_date": "2026-11-01",
     *     "end_date": "2026-11-07"
     * }
     */
    public function preview_report()
    {
        $this->api->require_method('POST');
        $this->authorize_sales_access();

        $input = $this->api->body();

        $this->require_report_dates($input);

        $start_date = $this->date_value(
            $input,
            [],
            'start_date',
            'Start date'
        );

        $end_date = $this->date_value(
            $input,
            [],
            'end_date',
            'End date'
        );

        $this->validate_report_date_range(
            $start_date,
            $end_date
        );

        $totals = $this->calculate_report_totals(
            $start_date,
            $end_date
        );

        $this->api->respond([
            'week_range' => $this->format_week_range(
                $start_date,
                $end_date
            ),
            'start_date' => $start_date,
            'end_date' => $end_date,
            'total_sales' => $totals['total_sales'],
            'total_production' => $totals['total_production'],
            'generated_date' => date('Y-m-d'),
        ]);
    }

    /**
     * Save report.
     *
     * Important:
     * Totals are recalculated by the backend.
     * Client-submitted totals are ignored.
     */
    public function add_report()
    {
        $this->api->require_method('POST');
        $this->authorize_sales_access();

        $input = $this->api->body();

        $this->require_report_dates($input);

        $report_data = $this->report_data($input);

        $id = $this->models['reports']->_insert($report_data);

        $this->created_response($id, 'Weekly report');
    }

    /**
     * Update report.
     *
     * Totals are recalculated using the updated date range.
     */
    public function update_report($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_sales_access();

        $current = $this->find_record('reports', $id);
        $input = $this->api->body();

        $start_date = $this->date_value(
            $input,
            $current,
            'start_date',
            'Start date'
        );

        $end_date = $this->date_value(
            $input,
            $current,
            'end_date',
            'End date'
        );

        $this->validate_report_date_range(
            $start_date,
            $end_date
        );

        $report_data = $this->report_data(
            $input,
            $current
        );

        $this->models['reports']->_update(
            (int) $current['id'],
            $report_data
        );

        $this->api->respond([
            'message' => 'Weekly report updated successfully.'
        ]);
    }

    /**
     * Delete report.
     */
    public function delete_report($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_sales_access();

        $record = $this->find_record('reports', $id);

        $this->models['reports']->_delete((int) $record['id']);

        $this->api->respond([
            'message' => 'Weekly report deleted successfully.'
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | REPORT COMPUTATION
    |--------------------------------------------------------------------------
    */

    /**
     * Calculate sales and milled rice production for a date range.
     *
     * Sales:
     * - Includes Paid sales transactions and Paid, non-cancelled shop orders
     * - Uses sale_date/amount for transactions and order_date/total_amount for orders
     * - Avoids counting a shop order again when it already has a Paid transaction
     *
     * Production:
     * - Source: milling_records table
     * - Only Completed milling records
     * - Uses milling_date and rice_output_kg
     * - Excludes bran and broken rice
     */
    private function calculate_report_totals($start_date, $end_date)
    {
        $sales_statement = $this->db->raw(
            'SELECT
                COALESCE((
                    SELECT SUM(s.amount)
                    FROM sales s
                    WHERE s.sale_date >= ?
                      AND s.sale_date < DATE_ADD(?, INTERVAL 1 DAY)
                      AND s.status = ?
                ), 0) +
                COALESCE((
                    SELECT SUM(o.total_amount)
                    FROM orders o
                    WHERE o.order_date >= ?
                      AND o.order_date < DATE_ADD(?, INTERVAL 1 DAY)
                      AND o.payment_status = ?
                      AND COALESCE(LOWER(TRIM(o.status)), ?) <> ?
                      AND NOT EXISTS (
                          SELECT 1
                          FROM sales linked_sale
                          WHERE linked_sale.orders_id = o.id
                            AND linked_sale.status = ?
                      )
                ), 0) AS total_sales',
            [
                $start_date,
                $end_date,
                'Paid',
                $start_date,
                $end_date,
                'Paid',
                '',
                'cancelled',
                'Paid'
            ]
        );

        $sales_result = $sales_statement->fetch(PDO::FETCH_ASSOC);

        $production_statement = $this->db->raw(
            'SELECT COALESCE(SUM(rice_output_kg), 0) AS total_production
             FROM milling_records
             WHERE milling_date >= ?
               AND milling_date <= ?
               AND status = ?',
            [
                $start_date,
                $end_date,
                'Completed'
            ]
        );

        $production_result = $production_statement->fetch(PDO::FETCH_ASSOC);

        return [
            'total_sales' => round(
                (float) ($sales_result['total_sales'] ?? 0),
                2
            ),
            'total_production' => round(
                (float) ($production_result['total_production'] ?? 0),
                2
            ),
        ];
    }

    /**
     * Prepare report data using backend-computed totals.
     */
    private function report_data(array $input, array $current = [])
    {
        $start_date = $this->date_value(
            $input,
            $current,
            'start_date',
            'Start date'
        );

        $end_date = $this->date_value(
            $input,
            $current,
            'end_date',
            'End date'
        );

        $this->validate_report_date_range(
            $start_date,
            $end_date
        );

        $totals = $this->calculate_report_totals(
            $start_date,
            $end_date
        );

        return [
            'week_range' => $this->format_week_range(
                $start_date,
                $end_date
            ),
            'start_date' => $start_date,
            'end_date' => $end_date,
            'total_sales' => $totals['total_sales'],
            'total_production' => $totals['total_production'],
            'generated_date' => date('Y-m-d'),
        ];
    }

    /**
     * Generate readable date range label.
     */
    private function format_week_range($start_date, $end_date)
    {
        $start = DateTime::createFromFormat(
            '!Y-m-d',
            $start_date
        );

        $end = DateTime::createFromFormat(
            '!Y-m-d',
            $end_date
        );

        return $start->format('M j, Y') .
            ' - ' .
            $end->format('M j, Y');
    }

    /**
     * Ensure both dates are submitted.
     */
    private function require_report_dates(array $input)
    {
        if (
            !isset($input['start_date']) ||
            !isset($input['end_date']) ||
            $input['start_date'] === '' ||
            $input['end_date'] === ''
        ) {
            $this->api->respond_error(
                'Start date and end date are required.',
                422
            );
        }
    }

    /**
     * Validate date range.
     */
    private function validate_report_date_range(
        $start_date,
        $end_date
    ) {
        if ($start_date === null || $end_date === null) {
            $this->api->respond_error(
                'Start date and end date are required.',
                422
            );
        }

        if ($end_date < $start_date) {
            $this->api->respond_error(
                'End date cannot be earlier than start date.',
                422
            );
        }
    }

    /*
    |--------------------------------------------------------------------------
    | DATA PREPARATION
    |--------------------------------------------------------------------------
    */

    private function order_data(array $input, array $current = [])
    {
        $status = $this->string_value(
            $input, $current, 'status', 'Status', 50, true, 'Pending'
        );
        $payment_status = $this->payment_status_value($input, $current);

        if (strtolower(trim($status)) === 'delivered') {
            $payment_status = 'Paid';
        }

        return [
            'order_code' => $this->string_value(
                $input, $current, 'order_code', 'Order code', 50, true
            ),
            'mill_inventory_id' => $this->foreign_id(
                $input, $current, 'mill_inventory_id', 'mill_inventory'
            ),
            'customer_name' => $this->string_value(
                $input, $current, 'customer_name', 'Customer name', 150, true
            ),
            'items_ordered' => $this->string_value(
                $input, $current, 'items_ordered', 'Items ordered', 65535, true
            ),
            'payment_method' => $this->string_value(
                $input, $current, 'payment_method', 'Payment method', 100, true
            ),
            'payment_status' => $payment_status,
            'order_date' => $this->date_value(
                $input, $current, 'order_date', 'Order date'
            ),
            'total_amount' => $this->number_value(
                $input, $current, 'total_amount', 'Total amount', 99999999.99
            ),
            'status' => $status,
        ];
    }

    private function payment_status_value(array $input, array $current = [])
    {
        $status = $this->string_value(
            $input,
            $current,
            'payment_status',
            'Payment status',
            20,
            true,
            'Unpaid'
        );

        if (!in_array($status, ['Paid', 'Unpaid'], true)) {
            $this->api->respond_error(
                'Payment status must be Paid or Unpaid.',
                422
            );
        }

        return $status;
    }

    private function transaction_data(array $input, array $current = [])
    {
        $order_id = $this->foreign_id(
            $input, $current, 'orders_id', 'orders'
        );

        $inventory_id = $this->foreign_id(
            $input, $current, 'mill_inventory_id', 'mill_inventory'
        );

        return [
            'transaction_code' => $this->string_value(
                $input, $current, 'transaction_code', 'Transaction code', 50, true
            ),
            'orders_id' => $order_id,
            'mill_inventory_id' => $inventory_id,
            'customer_name' => $this->string_value(
                $input, $current, 'customer_name', 'Customer name', 150, true
            ),
            'product_name' => $this->string_value(
                $input, $current, 'product_name', 'Product name', 255, true
            ),
            'payment_method' => $this->string_value(
                $input, $current, 'payment_method', 'Payment method', 100, true
            ),
            'sale_date' => $this->date_value(
                $input, $current, 'sale_date', 'Sale date'
            ),
            'amount' => $this->number_value(
                $input, $current, 'amount', 'Amount', 99999999.99
            ),
            'status' => $this->string_value(
                $input, $current, 'status', 'Status', 50, true, 'Paid'
            ),
        ];
    }

    /**
     * Product fields based on Option A.
     * No product stock_quantity and no unit.
     */
    private function product_data(array $input, array $current = [])
    {
        $inventory_id = $this->foreign_id(
            $input,
            $current,
            'mill_inventory_id',
            'mill_inventory'
        );

        if ($inventory_id === null) {
            $this->api->respond_error(
                'Please select a Mill Inventory record for this product.',
                422
            );
        }

        $sack_size = array_key_exists('sack_size_kg', $input)
            ? $input['sack_size_kg']
            : ($current['sack_size_kg'] ?? 25);

        if (
            !is_numeric($sack_size) ||
            !in_array((int) $sack_size, [25, 50], true) ||
            (float) $sack_size !== (float) (int) $sack_size
        ) {
            $this->api->respond_error(
                'Sack size must be either 25 kg or 50 kg.',
                422
            );
        }

        return [
            'mill_inventory_id' => $inventory_id,

            'product_name' => $this->string_value(
                $input,
                $current,
                'product_name',
                'Product name',
                150,
                true
            ),

            'category' => $this->string_value(
                $input,
                $current,
                'category',
                'Category',
                50,
                false
            ),

            'sack_size_kg' => (int) $sack_size,

            'price' => $this->number_value(
                $input,
                $current,
                'price',
                'Price',
                99999999.99
            ),

            'description' => $this->string_value(
                $input,
                $current,
                'description',
                'Description',
                65535,
                false
            ),

            'image' => $this->string_value(
                $input,
                $current,
                'image',
                'Image URL',
                255,
                false
            ),

            'status' => $this->string_value(
                $input,
                $current,
                'status',
                'Status',
                50,
                true,
                'Available'
            ),
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATION HELPERS
    |--------------------------------------------------------------------------
    */

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

    private function require_fields(array $input, array $fields)
    {
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
                $label . ' must be a non-empty value of at most ' .
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

        $table_name = [
            'mill_inventory' => 'mill_inventory',
            'orders' => 'orders',
        ][$table] ?? null;

        if ($table_name === null) {
            $this->api->respond_error(
                'Invalid reference table.',
                500
            );
        }

        $statement = $this->db->raw(
            "SELECT id FROM {$table_name} WHERE id = ? LIMIT 1",
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

    /*
    |--------------------------------------------------------------------------
    | RESPONSE HELPERS
    |--------------------------------------------------------------------------
    */

    private function created_response($id, $label)
    {
        if ($id === false) {
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

    /*
    |--------------------------------------------------------------------------
    | AUTHORIZATION
    |--------------------------------------------------------------------------
    */

    private function authorize_sales_access()
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
                $user['section'] === 'sales'
            )
        ) {
            $this->api->respond_error(
                'You are not authorized to access the sales section.',
                403
            );
        }
    }
}
