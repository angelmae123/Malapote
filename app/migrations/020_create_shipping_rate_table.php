
<?php

class Create_shipping_rate_table {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        $this->_lava->dbforge->add_field([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => TRUE,
                'auto_increment' => TRUE
            ],

            'municipality' => [
                'type'       => 'VARCHAR',
                'constraint' => 150,
                'null'       => FALSE,
            ],

            'barangay' => [
                'type'       => 'VARCHAR',
                'constraint' => 150,
                'null'       => TRUE,
            ],

            'min_sacks' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'  => TRUE,
                'default'   => 1,
            ],

            'max_sacks' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'  => TRUE,
                'null'      => TRUE,
            ],

            'shipping_fee' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2',
                'default'    => 0.00,
            ],

            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,
                'default'    => 'Active',
            ],

            'created_at' => [
                'type' => 'DATETIME',
                'null' => TRUE,
            ],

            'updated_at' => [
                'type' => 'DATETIME',
                'null' => TRUE,
            ],
        ]);

        $this->_lava->dbforge->add_key('id', TRUE);
        $this->_lava->dbforge->create_table('shipping_rate');
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('shipping_rate');
    }
}
