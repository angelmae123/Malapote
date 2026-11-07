
<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Create_mill_inventory_table
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
            'milling_records_id' => [
                'type'        => 'INT',
                'constraint' => 11,
                'unsigned'    => TRUE,
                'null'        => TRUE,
            ],
            'item_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 150,
            ],
            'variety' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => TRUE,
            ],
            'category' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
            ],
            'stock_quantity' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2',
                'default'    => 0.00,
            ],
            'sack_quantity' => [
                'type'       => 'INT',
                'constraint' => 11,
                'default'    => 0,
            ],
            'sack_weight_kg' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2',
                'null'       => TRUE,
            ],
            'source_quantity' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2',
                'default'    => 0.00,
            ],
            'source_key' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => TRUE,
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
        $this->_lava->dbforge->add_key('milling_records_id');
        $this->_lava->dbforge->add_key(
            'source_key',
            FALSE,
            TRUE,
            'source_key_unique'
        );

        $this->_lava->dbforge->create_table('mill_inventory');
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('mill_inventory');
    }
}
