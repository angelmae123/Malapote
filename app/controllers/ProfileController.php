
<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class ProfileController extends Controller
{
    private $db;
    private $api;

    public function __construct()
    {
        parent::__construct();

        $this->db = $this->call->database();
        $this->api = $this->call->library('api');
    }

    /**
     * Authenticate the customer and retrieve their current account.
     */
    private function require_customer()
    {
        $claims = $this->api->require_jwt();

        $statement = $this->db->raw(
            'SELECT id, username, full_name, email,
                    phone_number, delivery_address,
                    role, section, is_active
             FROM users
             WHERE id = ?
             LIMIT 1',
            [$claims['sub']]
        );

        $user = $statement->fetch(PDO::FETCH_ASSOC);

        if (!$user || !(int) $user['is_active']) {
            $this->api->respond_error('Unauthorized.', 401);
        }

        if ($user['role'] !== 'customer') {
            $this->api->respond_error(
                'Only customer accounts can access this profile.',
                403
            );
        }

        return $user;
    }

    /**
     * GET: api/shop/profile
     * Retrieve the authenticated customer's profile.
     */
    public function show()
    {
        $user = $this->require_customer();

        $this->api->respond([
            'success' => true,
            'message' => 'Profile retrieved successfully.',
            'user' => $user,
        ]);
    }

    /**
     * PUT: api/shop/profile
     * Update the authenticated customer's profile.
     */
    public function update()
    {
        $user = $this->require_customer();

        $data = $this->request->json();

        if (!is_array($data)) {
            $this->api->respond_error(
                'Request body must be valid JSON.',
                400
            );
        }

        $user_id = (int) $user['id'];

        $username = $data['username'] ?? $user['username'];
        $full_name = $data['full_name'] ?? $user['full_name'];
        $email = $data['email'] ?? $user['email'];
        $phone_number = $data['phone_number'] ?? $user['phone_number'];
        $delivery_address = $data['delivery_address'] ?? $user['delivery_address'];

        // Validate input types.
        if (
            !is_string($username) ||
            !is_string($full_name) ||
            !is_string($email) ||
            !is_string($phone_number) ||
            !is_string($delivery_address)
        ) {
            $this->api->respond_error(
                'All profile fields must contain valid text values.',
                422
            );
        }

        // Normalize values.
        $username = trim($username);
        $full_name = trim($full_name);
        $email = strtolower(trim($email));
        $phone_number = trim($phone_number);
        $delivery_address = trim($delivery_address);

        // Required fields.
        if ($username === '' || $email === '') {
            $this->api->respond_error(
                'Username and email are required.',
                422
            );
        }

        // Length validation.
        if (
            strlen($username) > 100 ||
            strlen($full_name) > 150 ||
            strlen($email) > 255 ||
            strlen($phone_number) > 30
        ) {
            $this->api->respond_error(
                'One or more profile fields exceed the allowed length.',
                422
            );
        }

        // Email validation.
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->api->respond_error(
                'Please provide a valid email address.',
                422
            );
        }

        // Check duplicate username.
        $username_check = $this->db->raw(
            'SELECT id FROM users
             WHERE username = ? AND id <> ?
             LIMIT 1',
            [$username, $user_id]
        );

        if ($username_check->fetch(PDO::FETCH_ASSOC)) {
            $this->api->respond_error(
                'This username is already being used.',
                409
            );
        }

        // Check duplicate email.
        $email_check = $this->db->raw(
            'SELECT id FROM users
             WHERE email = ? AND id <> ?
             LIMIT 1',
            [$email, $user_id]
        );

        if ($email_check->fetch(PDO::FETCH_ASSOC)) {
            $this->api->respond_error(
                'This email address is already being used.',
                409
            );
        }

        // Update only the authenticated customer's editable fields.
        $this->db->raw(
            'UPDATE users
             SET username = ?,
                 full_name = ?,
                 email = ?,
                 phone_number = ?,
                 delivery_address = ?
             WHERE id = ? AND role = ?',
            [
                $username,
                $full_name !== '' ? $full_name : null,
                $email,
                $phone_number !== '' ? $phone_number : null,
                $delivery_address !== '' ? $delivery_address : null,
                $user_id,
                'customer',
            ]
        );

        // Retrieve updated profile.
        $updated = $this->db->raw(
            'SELECT id, username, full_name, email,
                    phone_number, delivery_address,
                    role, section, is_active
             FROM users
             WHERE id = ?
             LIMIT 1',
            [$user_id]
        );

        $updated_user = $updated->fetch(PDO::FETCH_ASSOC);

        $this->api->respond([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'user' => $updated_user,
        ]);
    }
}
