
<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Create_products_table
{
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
            'mill_inventory_id' => [
                'type'        => 'INT',
                'constraint' => 11,
                'unsigned'    => TRUE,
                'null'        => TRUE,
            ],
            'product_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 150,
            ],
            'category' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'null'       => TRUE,
            ],
            'sack_size_kg' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2',
                'default'    => 25.00,
            ],
            'price' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2',
                'default'    => 0.00,
            ],
            'description' => [
                'type' => 'TEXT',
                'null' => TRUE,
            ],
            'image' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => TRUE,
            ],
            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
                'default'    => 'Available',
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
        $this->_lava->dbforge->add_key('mill_inventory_id');

        $this->_lava->dbforge->create_table('products');
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('products');
    }
}
