
<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class UserModel extends Model
{
    protected $table = 'users';
    protected $primary_key = 'id';

    protected $fillable = [
        'username',
        'full_name',
        'email',
        'phone_number',
        'delivery_address',
    ];

    protected $guarded = [
        'id',
        'password',
        'role',
        'section',
        'is_active'
    ];

    public function __construct()
    {
        parent::__construct();
    }

    public function create_customer(
        string $username,
        string $email,
        string $password
    ) {
        if (
            trim($username) === '' ||
            !filter_var($email, FILTER_VALIDATE_EMAIL) ||
            $password === ''
        ) {
            throw new InvalidArgumentException(
                'A username, valid email, and password are required.'
            );
        }

        $this->db->table($this->table)->insert([
            'username' => trim($username),
            'email' => strtolower(trim($email)),
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'role' => 'customer',
            'section' => null,
            'is_active' => 1,
        ]);

        return $this->db->last_id();
    }

    public function verify_credentials(
        string $identifier,
        string $password
    ): ?array {
        $user = $this->db->table($this->table)
            ->where('email', strtolower(trim($identifier)))
            ->get();

        if (!$user) {
            $user = $this->db->table($this->table)
                ->where('username', trim($identifier))
                ->get();
        }

        if (
            !$user ||
            !(int) ($user['is_active'] ?? 0) ||
            !password_verify($password, $user['password'] ?? '')
        ) {
            return null;
        }

        unset($user['password']);

        return $user;
    }
}
