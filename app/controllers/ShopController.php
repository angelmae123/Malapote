
<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class ShopController extends Controller
{
    private $products;
    private $mill_inventory;
    private $api;
    private $db;

    public function __construct()
    {
        parent::__construct();

        $this->db = $this->call->database();
        $this->products = $this->call->model('ProductsModel');
        $this->mill_inventory = $this->call->model('RInventoryModel');
        $this->api = $this->call->library('api');
    }

    /**
     * REQUIRE AUTHENTICATED CUSTOMER
     */
    private function require_customer()
    {
        $claims = $this->api->require_jwt();
        $customer_id = (int) ($claims['sub'] ?? 0);

        if ($customer_id <= 0) {
            $this->api->respond_error('Unauthorized.', 401);
        }

        $statement = $this->db->raw(
            "SELECT id, username, email, role, is_active
             FROM users
             WHERE id = ?
             LIMIT 1",
            [$customer_id]
        );

        $customer = $statement->fetch(PDO::FETCH_ASSOC);

        if (
            !$customer ||
            $customer['role'] !== 'customer' ||
            !(int) $customer['is_active']
        ) {
            $this->api->respond_error(
                'Only active customer accounts can access this resource.',
                403
            );
        }

        return $customer;
    }

    /**
     * PUBLIC SHOP PRODUCTS
     *
     * Mill inventory stock is measured in kilograms.
     * Products sharing one inventory record share the same stock.
     */
    public function products()
    {
        $this->api->require_method('GET');

        try {
            $product_catalog = $this->products->_all();
            $inventory_records = $this->mill_inventory->_all();

            $inventory_by_id = [];

            foreach ($inventory_records as $inventory) {
                $inventory_id = $inventory['id']
                    ?? $inventory['mill_inventory_id']
                    ?? null;

                if ($inventory_id !== null) {
                    $inventory_by_id[(string) $inventory_id] = $inventory;
                }
            }

            $public_products = [];

            foreach ($product_catalog as $product) {
                $status = strtolower(
                    trim((string) ($product['status'] ?? ''))
                );

                if ($status !== 'available') {
                    continue;
                }

                $inventory_id = (int) ($product['mill_inventory_id'] ?? 0);

                if (
                    $inventory_id <= 0 ||
                    !isset($inventory_by_id[(string) $inventory_id])
                ) {
                    continue;
                }

                $inventory = $inventory_by_id[(string) $inventory_id];

                $available_stock = (float) (
                    $inventory['stock_quantity'] ?? 0
                );

                if ($available_stock <= 0) {
                    continue;
                }

                $sack_size_kg = (float) (
                    $product['sack_size_kg'] ?? 0
                );

                if ($sack_size_kg > 0) {
                    // Available full sacks based on actual kilogram stock.
                    $available_sacks = (int) floor(
                        $available_stock / $sack_size_kg
                    );

                    if ($available_sacks <= 0) {
                        continue;
                    }
                } else {
                    // Loose rice is sold by kilogram.
                    $available_sacks = 0;
                }

                $public_products[] = [
                    'id' => (int) $product['id'],
                    'mill_inventory_id' => $inventory_id,
                    'product_name' => $product['product_name'],
                    'category' => $product['category'] ?? null,
                    'sack_size_kg' => (int) $sack_size_kg,
                    'price' => (float) $product['price'],
                    'description' => $product['description'] ?? null,
                    'image' => $product['image'] ?? null,
                    'status' => $product['status'],
                    'variety' => $inventory['variety'] ?? null,

                    // Shared inventory stock in kilograms.
                    'stock_quantity' => $available_stock,

                    // Available sacks for this listing.
                    'sack_quantity' => $available_sacks,

                    'sack_weight_kg' => isset($inventory['sack_weight_kg'])
                        ? (float) $inventory['sack_weight_kg']
                        : null,
                ];
            }

            $this->api->respond($public_products);

        } catch (Throwable $e) {
            $this->api->respond([
                'success' => false,
                'message' => 'Unable to load shop products.'
            ], 500);
        }
    }

    /**
     * PUBLIC ACTIVE SHIPPING RATES
     *
     * One fixed shipping fee per destination.
     * No min_sacks or max_sacks calculation.
     */
    public function shipping_rates()
    {
        $this->api->require_method('GET');

        try {
            $query = $this->db->raw(
                "SELECT
                    id,
                    municipality,
                    barangay,
                    shipping_fee
                 FROM shipping_rate
                 WHERE LOWER(TRIM(status)) = 'active'
                 ORDER BY municipality ASC, barangay ASC"
            );

            $rates = $query->fetchAll(PDO::FETCH_ASSOC);

            foreach ($rates as &$rate) {
                $rate['shipping_fee'] = (float) $rate['shipping_fee'];
            }

            unset($rate);

            $this->api->respond($rates ?: []);

        } catch (Throwable $e) {
            $this->api->respond([
                'success' => false,
                'message' => 'Unable to load shipping rates.'
            ], 500);
        }
    }

    /**
     * CUSTOMER CHECKOUT
     *
     * Packaged rice:
     * quantity_kg = quantity * sack_size_kg
     *
     * Loose rice:
     * quantity_kg = quantity
     *
     * Shipping:
     * One fixed shipping fee per order based on destination.
     *
     * Inventory:
     * Exact kilograms are deducted from shared mill inventory.
     */
    public function checkout()
    {
        $this->api->require_method('POST');

        $customer = $this->require_customer();
        $customer_id = (int) $customer['id'];

        $input = json_decode(file_get_contents('php://input'), true);

        if (!is_array($input)) {
            $this->api->respond([
                'success' => false,
                'message' => 'Invalid checkout request.'
            ], 400);
            return;
        }

        $customer_name = trim((string) ($input['customer_name'] ?? ''));
        $contact_number = trim((string) ($input['contact_number'] ?? ''));
        $email = trim((string) ($input['email'] ?? ''));
        $delivery_address = trim((string) ($input['delivery_address'] ?? ''));
        $municipality = trim((string) ($input['municipality'] ?? ''));
        $barangay = trim((string) ($input['barangay'] ?? ''));
        $payment_method = trim((string) ($input['payment_method'] ?? ''));
        $order_notes = trim((string) ($input['order_notes'] ?? ''));

        $items = $input['items_ordered'] ?? [];

        if (
            $customer_name === '' ||
            $contact_number === '' ||
            $delivery_address === '' ||
            $municipality === '' ||
            $barangay === '' ||
            $payment_method === ''
        ) {
            $this->api->respond([
                'success' => false,
                'message' => 'Please complete all required delivery and customer details.'
            ], 400);
            return;
        }

        if (!is_array($items) || empty($items)) {
            $this->api->respond([
                'success' => false,
                'message' => 'Your cart is empty.'
            ], 400);
            return;
        }

        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->api->respond([
                'success' => false,
                'message' => 'Please enter a valid email address.'
            ], 400);
            return;
        }

        try {
            $this->db->transaction();

            $subtotal = 0;
            $verified_items = [];
            $inventory_changes = [];

            foreach ($items as $item) {
                $product_id = (int) ($item['product_id'] ?? 0);
                $quantity = filter_var(
                    $item['quantity'] ?? null,
                    FILTER_VALIDATE_FLOAT
                );

                if (
                    $product_id <= 0 ||
                    $quantity === false ||
                    $quantity <= 0 ||
                    !is_finite((float) $quantity) ||
                    floor((float) $quantity) != (float) $quantity
                ) {
                    throw new Exception(
                        'Product quantities must be positive whole numbers.'
                    );
                }

                $quantity = (float) $quantity;

                // Always get the actual product data from the database.
                $product_query = $this->db->raw(
                    "SELECT
                        id,
                        mill_inventory_id,
                        product_name,
                        price,
                        sack_size_kg,
                        status
                     FROM products
                     WHERE id = ?
                     LIMIT 1",
                    [$product_id]
                );

                $product = $product_query->fetch(PDO::FETCH_ASSOC);

                if (!$product) {
                    throw new Exception(
                        'A product in your cart no longer exists.'
                    );
                }

                if (
                    strtolower(trim((string) $product['status'])) !==
                    'available'
                ) {
                    throw new Exception(
                        $product['product_name'] .
                        ' is currently unavailable.'
                    );
                }

                $inventory_id = (int) (
                    $product['mill_inventory_id'] ?? 0
                );

                if ($inventory_id <= 0) {
                    throw new Exception(
                        $product['product_name'] .
                        ' has no linked mill inventory.'
                    );
                }

                $sack_size_kg = (float) (
                    $product['sack_size_kg'] ?? 0
                );

                $is_loose_rice = ($sack_size_kg <= 0);

                // Convert ordered quantity into kilograms.
                $quantity_kg = $is_loose_rice
                    ? $quantity
                    : ($quantity * $sack_size_kg);

                if (
                    $quantity_kg <= 0 ||
                    !is_finite($quantity_kg)
                ) {
                    throw new Exception(
                        'Invalid product quantity.'
                    );
                }

                $inventory_key = (string) $inventory_id;

                // Lock each shared inventory record only once.
                if (!isset($inventory_changes[$inventory_key])) {
                    $inventory_query = $this->db->raw(
                        "SELECT
                            id,
                            stock_quantity
                         FROM mill_inventory
                         WHERE id = ?
                         LIMIT 1
                         FOR UPDATE",
                        [$inventory_id]
                    );

                    $inventory = $inventory_query->fetch(PDO::FETCH_ASSOC);

                    if (!$inventory) {
                        throw new Exception(
                            'The inventory record for ' .
                            $product['product_name'] .
                            ' could not be found.'
                        );
                    }

                    $inventory_changes[$inventory_key] = [
                        'id' => $inventory_id,
                        'remaining_stock' => (float) (
                            $inventory['stock_quantity'] ?? 0
                        ),
                        'deduction_kg' => 0,
                    ];
                }

                // Check stock against the remaining shared inventory.
                if (
                    $quantity_kg >
                    $inventory_changes[$inventory_key]['remaining_stock']
                ) {
                    throw new Exception(
                        'Insufficient stock for ' .
                        $product['product_name'] . '.'
                    );
                }

                $inventory_changes[$inventory_key]['remaining_stock']
                    -= $quantity_kg;

                $inventory_changes[$inventory_key]['deduction_kg']
                    += $quantity_kg;

                $unit_price = (float) $product['price'];
                $item_subtotal = $unit_price * $quantity;

                $subtotal += $item_subtotal;

                $verified_items[] = [
                    'product_id' => (int) $product['id'],
                    'mill_inventory_id' => $inventory_id,
                    'product_name' => $product['product_name'],
                    'sack_size_kg' => (int) $sack_size_kg,
                    'quantity' => $quantity,
                    'quantity_kg' => $quantity_kg,
                    'unit_type' => $is_loose_rice ? 'kg' : 'sacks',
                    'unit_price' => $unit_price,
                    'subtotal' => $item_subtotal,
                ];
            }

            /*
             * FIXED SHIPPING FEE
             *
             * One order = one shipping fee.
             * Exact barangay rate takes priority.
             * If there is no barangay-specific rate,
             * use the municipality-wide rate.
             */
            $shipping_query = $this->db->raw(
                "SELECT
                    id,
                    municipality,
                    barangay,
                    shipping_fee
                 FROM shipping_rate
                 WHERE
                    LOWER(TRIM(status)) = 'active'
                    AND LOWER(TRIM(municipality)) = LOWER(TRIM(?))
                    AND (
                        barangay IS NULL
                        OR TRIM(barangay) = ''
                        OR LOWER(TRIM(barangay)) = LOWER(TRIM(?))
                    )
                 ORDER BY
                    CASE
                        WHEN barangay IS NOT NULL
                            AND TRIM(barangay) != ''
                            AND LOWER(TRIM(barangay)) = LOWER(TRIM(?))
                        THEN 0
                        ELSE 1
                    END ASC
                 LIMIT 1",
                [
                    $municipality,
                    $barangay,
                    $barangay
                ]
            );

            $shipping_rate = $shipping_query->fetch(PDO::FETCH_ASSOC);

            if (!$shipping_rate) {
                throw new Exception(
                    'No active shipping rate is available for ' .
                    $barangay . ', ' . $municipality . '.'
                );
            }

            // One fixed shipping fee for the entire order.
            $shipping_fee = (float) $shipping_rate['shipping_fee'];

            if ($shipping_fee < 0) {
                throw new Exception('Invalid shipping fee.');
            }

            $grand_total = $subtotal + $shipping_fee;

            // Deduct exact kilograms from every affected inventory.
            foreach ($inventory_changes as $change) {
                $this->db->raw(
                    "UPDATE mill_inventory
                     SET
                        stock_quantity = ?,
                        updated_at = NOW()
                     WHERE id = ?",
                    [
                        max(0, $change['remaining_stock']),
                        $change['id']
                    ]
                );
            }

            // Set order inventory ID only when all items use one inventory.
            $order_inventory_id = null;

            if (count($inventory_changes) === 1) {
                $first_inventory = reset($inventory_changes);
                $order_inventory_id = $first_inventory['id'];
            }

            $order_code = 'AGR-' . date('Ymd') . '-' .
                strtoupper(bin2hex(random_bytes(3)));

            $items_json = json_encode(
                $verified_items,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            );

            if ($items_json === false) {
                throw new Exception(
                    'Unable to prepare order items.'
                );
            }

            $this->db->raw(
                "INSERT INTO orders (
                    customer_id,
                    order_code,
                    mill_inventory_id,
                    customer_name,
                    contact_number,
                    email,
                    delivery_address,
                    municipality,
                    barangay,
                    order_notes,
                    items_ordered,
                    payment_method,
                    order_date,
                    shipping_fee,
                    total_amount,
                    status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    $customer_id,
                    $order_code,
                    $order_inventory_id,
                    $customer_name,
                    $contact_number,
                    $email !== '' ? $email : null,
                    $delivery_address,
                    $municipality,
                    $barangay,
                    $order_notes !== '' ? $order_notes : null,
                    $items_json,
                    $payment_method,
                    date('Y-m-d H:i:s'),
                    $shipping_fee,
                    $grand_total,
                    'Pending'
                ]
            );

            $order_id = $this->db->last_id();

            $this->db->commit();

            $this->api->respond([
                'success' => true,
                'message' => 'Your order has been placed successfully.',
                'order_id' => $order_id,
                'order_code' => $order_code,
                'subtotal' => round($subtotal, 2),
                'shipping_fee' => round($shipping_fee, 2),
                'total_amount' => round($grand_total, 2),
                'status' => 'Pending',
            ]);

        } catch (Throwable $e) {
            try {
                $this->db->roll_back();
            } catch (Throwable $rollback_error) {
                // Ignore rollback errors.
            }

            $this->api->respond([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * CUSTOMER MY ORDERS
     */
    public function my_orders()
    {
        $this->api->require_method('GET');

        $customer = $this->require_customer();
        $customer_id = (int) $customer['id'];

        try {
            $query = $this->db->raw(
                "SELECT
                    id,
                    customer_id,
                    order_code,
                    customer_name,
                    contact_number,
                    email,
                    delivery_address,
                    municipality,
                    barangay,
                    order_notes,
                    items_ordered,
                    payment_method,
                    payment_status,
                    order_date,
                    shipping_fee,
                    total_amount,
                    status
                 FROM orders
                 WHERE customer_id = ?
                 ORDER BY order_date DESC, id DESC",
                [$customer_id]
            );

            $orders = $query->fetchAll(PDO::FETCH_ASSOC);

            foreach ($orders as &$order) {
                $decoded_items = json_decode(
                    $order['items_ordered'] ?? '[]',
                    true
                );

                $order['items_ordered'] = is_array($decoded_items)
                    ? $decoded_items
                    : [];

                $order['shipping_fee'] = (float) (
                    $order['shipping_fee'] ?? 0
                );

                $order['total_amount'] = (float) (
                    $order['total_amount'] ?? 0
                );
            }

            unset($order);

            $this->api->respond([
                'success' => true,
                'orders' => $orders,
            ]);

        } catch (Throwable $e) {
            $this->api->respond([
                'success' => false,
                'message' => 'Unable to load your orders.'
            ], 500);
        }
    }

    /**
     * CUSTOMER CANCEL ORDER
     *
     * Only the owner of a Pending order can cancel it.
     * Restores the exact kilograms deducted by checkout.
     */
    public function cancel_order($id = null)
    {
        $this->api->require_method('POST');

        $customer = $this->require_customer();
        $customer_id = (int) $customer['id'];
        $order_id = (int) $id;

        if ($order_id <= 0) {
            $this->api->respond([
                'success' => false,
                'message' => 'Invalid order ID.'
            ], 400);
            return;
        }

        try {
            $this->db->transaction();

            // Lock the order to prevent duplicate cancellation.
            $order_query = $this->db->raw(
                "SELECT
                    id,
                    customer_id,
                    items_ordered,
                    status
                 FROM orders
                 WHERE id = ?
                   AND customer_id = ?
                 LIMIT 1
                 FOR UPDATE",
                [$order_id, $customer_id]
            );

            $order = $order_query->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                throw new Exception('Order not found.');
            }

            if (
                strtolower(trim((string) $order['status'])) !==
                'pending'
            ) {
                throw new Exception(
                    'Only Pending orders can be cancelled. This order can no longer be cancelled.'
                );
            }

            $items = json_decode(
                $order['items_ordered'] ?? '[]',
                true
            );

            if (!is_array($items) || empty($items)) {
                throw new Exception(
                    'Unable to restore inventory because the order items are invalid.'
                );
            }

            // Group restoration quantities by inventory ID.
            $restorations = [];

            foreach ($items as $item) {
                $inventory_id = (int) (
                    $item['mill_inventory_id'] ?? 0
                );

                $quantity = (float) ($item['quantity'] ?? 0);

                $unit_type = strtolower(
                    trim((string) ($item['unit_type'] ?? ''))
                );

                $sack_size_kg = (float) (
                    $item['sack_size_kg'] ?? 0
                );

                if (
                    $inventory_id <= 0 ||
                    $quantity <= 0 ||
                    !is_finite($quantity) ||
                    !in_array($unit_type, ['kg', 'sacks'], true)
                ) {
                    throw new Exception(
                        'Invalid order item data. Inventory was not changed.'
                    );
                }

                // Prefer the exact kilograms saved during checkout.
                // Fallback supports older order JSON.
                if (isset($item['quantity_kg'])) {
                    $restore_kg = (float) $item['quantity_kg'];
                } elseif ($unit_type === 'sacks') {
                    $restore_kg = $quantity * $sack_size_kg;
                } else {
                    $restore_kg = $quantity;
                }

                if (
                    $restore_kg <= 0 ||
                    !is_finite($restore_kg)
                ) {
                    throw new Exception(
                        'Invalid inventory restoration quantity.'
                    );
                }

                $key = (string) $inventory_id;

                if (!isset($restorations[$key])) {
                    $restorations[$key] = [
                        'inventory_id' => $inventory_id,
                        'quantity_kg' => 0,
                    ];
                }

                $restorations[$key]['quantity_kg'] += $restore_kg;
            }

            // Restore exact kilograms to each linked inventory.
            foreach ($restorations as $restoration) {
                $inventory_query = $this->db->raw(
                    "SELECT id
                     FROM mill_inventory
                     WHERE id = ?
                     LIMIT 1
                     FOR UPDATE",
                    [$restoration['inventory_id']]
                );

                $inventory = $inventory_query->fetch(PDO::FETCH_ASSOC);

                if (!$inventory) {
                    throw new Exception(
                        'A mill inventory record for this order could not be found. Cancellation was not completed.'
                    );
                }

                $this->db->raw(
                    "UPDATE mill_inventory
                     SET
                        stock_quantity = COALESCE(stock_quantity, 0) + ?,
                        updated_at = NOW()
                     WHERE id = ?",
                    [
                        $restoration['quantity_kg'],
                        $restoration['inventory_id']
                    ]
                );
            }

            // Update order status after successful restoration.
            $this->db->raw(
                "UPDATE orders
                 SET status = 'Cancelled',
                     updated_at = NOW()
                 WHERE id = ?
                   AND customer_id = ?
                   AND LOWER(TRIM(status)) = 'pending'",
                [$order_id, $customer_id]
            );

            $this->db->commit();

            $this->api->respond([
                'success' => true,
                'message' => 'Your order has been cancelled successfully. The inventory stock has been restored.',
                'order_id' => $order_id,
                'status' => 'Cancelled',
            ]);

        } catch (Throwable $e) {
            try {
                $this->db->roll_back();
            } catch (Throwable $rollback_error) {
                // Ignore rollback errors.
            }

            $this->api->respond([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
}
