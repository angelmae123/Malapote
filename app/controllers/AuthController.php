<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class AuthController extends Controller
{
    private $user_model;
    private $api;
    private $db;

    private const SECTIONS = ['farm', 'mill', 'sales', 'office'];

    public function __construct()
    {
        parent::__construct();

        $this->db = $this->call->database();
        $this->user_model = $this->call->model('UserModel');
        $this->api = $this->call->library('api');
    }

    /**
     * Require an authenticated customer account.
     */
    private function require_customer()
    {
        $claims = $this->api->require_jwt();

        $statement = $this->db->raw(
            'SELECT id, username, full_name, email, contact_number,
                    delivery_address, role, section, is_active
             FROM users
             WHERE id = ?
             LIMIT 1',
            [$claims['sub']]
        );

        $user = $statement->fetch(PDO::FETCH_ASSOC);

        if (
            !$user ||
            !(int) $user['is_active'] ||
            $user['role'] !== 'customer'
        ) {
            $this->api->respond_error(
                'Unauthorized. Customer account required.',
                401
            );
        }

        return $user;
    }

    /**
     * Register a new customer account.
     */
    public function register()
    {
        $data = $this->request->json();

        if (!is_array($data)) {
            $this->api->respond_error(
                'Request body must be valid JSON.',
                400
            );
        }

        $username = $data['username'] ?? null;
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;
        $contact_number = $data['contact_number'] ?? null;

        if (
            !is_string($username) ||
            !is_string($email) ||
            !is_string($password) ||
            !is_string($contact_number)
        ) {
            $this->api->respond_error(
                'Username, email, password, and contact number are required.',
                422
            );
        }

        $username = trim($username);
        $email = strtolower(trim($email));
        $contact_number = trim($contact_number);

        if (
            $username === '' ||
            strlen($username) > 100 ||
            !filter_var($email, FILTER_VALIDATE_EMAIL) ||
            strlen($email) > 255
        ) {
            $this->api->respond_error(
                'Provide a valid username and email.',
                422
            );
        }

        if (
            $contact_number === '' ||
            strlen($contact_number) > 30 ||
            !preg_match('/^[0-9+\-\s()]+$/', $contact_number)
        ) {
            $this->api->respond_error(
                'Provide a valid contact number.',
                422
            );
        }

        if (strlen($password) < 8) {
            $this->api->respond_error(
                'Password must be at least 8 characters.',
                422
            );
        }

        if (
            $this->user_model->find_by('email', $email) ||
            $this->user_model->find_by('username', $username)
        ) {
            $this->api->respond_error(
                'An account with that username or email already exists.',
                409
            );
        }

        $user_id = $this->user_model->create_customer(
            $username,
            $email,
            $password,
            $contact_number
        );

        $tokens = $this->api->issue_tokens([
            'id' => $user_id,
            'role' => 'customer',
        ]);

        $this->api->respond([
            'message' => 'Account created successfully.',
            'user' => [
                'id' => $user_id,
                'username' => $username,
                'full_name' => null,
                'email' => $email,
                'contact_number' => $contact_number,
                'delivery_address' => null,
                'role' => 'customer',
                'section' => null,
            ],
            'tokens' => $tokens,
        ], 201);
    }

    /**
     * Login using email or username.
     */
    public function login()
    {
        $data = $this->request->json();

        if (!is_array($data)) {
            $this->api->respond_error(
                'Request body must be valid JSON.',
                400
            );
        }

        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;

        if (
            !is_string($email) ||
            !is_string($password) ||
            trim($email) === '' ||
            $password === ''
        ) {
            $this->api->respond_error(
                'Email and password are required.',
                422
            );
        }

        $user = $this->user_model->verify_credentials(
            $email,
            $password
        );

        if ($user === null) {
            $this->api->respond_error(
                'Invalid email or password.',
                401
            );
        }

        $tokens = $this->api->issue_tokens([
            'id' => $user['id'],
            'role' => $user['role'],
        ]);

        $this->api->respond([
            'message' => 'Login successful.',
            'user' => $user,
            'tokens' => $tokens,
        ]);
    }

    /**
     * Refresh access token.
     */
    public function refresh()
    {
        $data = $this->request->json();

        if (
            !is_array($data) ||
            !is_string($data['refresh_token'] ?? null) ||
            $data['refresh_token'] === ''
        ) {
            $this->api->respond_error(
                'A refresh token is required.',
                422
            );
        }

        $this->api->refresh_access_token(
            $data['refresh_token']
        );
    }

    /**
     * Logout and revoke refresh token.
     */
    public function logout()
    {
        $data = $this->request->json();

        if (
            !is_array($data) ||
            !is_string($data['refresh_token'] ?? null) ||
            $data['refresh_token'] === ''
        ) {
            $this->api->respond_error(
                'A refresh token is required.',
                422
            );
        }

        $this->api->revoke_refresh_token(
            $data['refresh_token']
        );

        $this->api->respond([
            'message' => 'Logged out successfully.',
        ]);
    }

    /**
     * Get customer profile.
     */
    public function get_profile()
    {
        $user = $this->require_customer();

        $this->api->respond([
            'success' => true,
            'user' => $user,
        ]);
    }

    /**
     * Update customer profile.
     */
    public function update_profile()
    {
        $user = $this->require_customer();
        $data = $this->request->json();

        if (!is_array($data)) {
            $this->api->respond_error(
                'Request body must be valid JSON.',
                400
            );
        }

        $full_name = $data['full_name'] ?? '';
        $contact_number = $data['contact_number'] ?? '';
        $delivery_address = $data['delivery_address'] ?? '';

        if (
            !is_string($full_name) ||
            !is_string($contact_number) ||
            !is_string($delivery_address)
        ) {
            $this->api->respond_error(
                'Invalid profile information.',
                422
            );
        }

        $full_name = trim($full_name);
        $contact_number = trim($contact_number);
        $delivery_address = trim($delivery_address);

        if (strlen($full_name) > 150) {
            $this->api->respond_error(
                'Full name must not exceed 150 characters.',
                422
            );
        }

        if (
            strlen($contact_number) > 30 ||
            (
                $contact_number !== '' &&
                !preg_match('/^[0-9+\-\s()]+$/', $contact_number)
            )
        ) {
            $this->api->respond_error(
                'Provide a valid contact number.',
                422
            );
        }

        if (strlen($delivery_address) > 2000) {
            $this->api->respond_error(
                'Delivery address is too long.',
                422
            );
        }

        $this->db->raw(
            'UPDATE users
             SET full_name = ?,
                 contact_number = ?,
                 delivery_address = ?
             WHERE id = ?
               AND role = ?
               AND is_active = 1',
            [
                $full_name !== '' ? $full_name : null,
                $contact_number !== '' ? $contact_number : null,
                $delivery_address !== '' ? $delivery_address : null,
                $user['id'],
                'customer',
            ]
        );

        $statement = $this->db->raw(
            'SELECT id, username, full_name, email, contact_number,
                    delivery_address, role, section, is_active
             FROM users
             WHERE id = ?
             LIMIT 1',
            [$user['id']]
        );

        $updated_user = $statement->fetch(PDO::FETCH_ASSOC);

        $this->api->respond([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'user' => $updated_user,
        ]);
    }

    /**
     * Check section access.
     */
    public function section_access($section)
    {
        $user = $this->require_section_access($section);

        $this->api->respond([
            'authorized' => true,
            'section' => $section,
            'user' => $user,
        ]);
    }

    /**
     * Validate section administrator access.
     */
    public function require_section_access($section)
    {
        if (!in_array($section, self::SECTIONS, true)) {
            $this->api->respond_error(
                'Unknown section.',
                404
            );
        }

        $claims = $this->api->require_jwt();

        $statement = $this->db->raw(
            'SELECT id, username, email, role, section, is_active
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

        $has_access = in_array($user['role'], ['admin'], true)
            || (
                $user['role'] === 'section_admin' &&
                $user['section'] === $section
            );

        if (!$has_access) {
            $this->api->respond_error(
                'You are not authorized to access this section.',
                403
            );
        }

        return $user;
    }
}
