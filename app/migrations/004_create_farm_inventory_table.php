<?php

class Create_farm_inventory_table {

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
            'season_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => TRUE,
                'null'       => TRUE,
            ],
            'farm_act_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => TRUE,
                'null'       => TRUE, // Foreign key patungo sa farm_act table
            ],
            'item_category' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  
            ],
            'item_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 150, 
            ],
            'quantity' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2',
                'default'    => 0.00,
            ],
            'unit' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  
                'null'       => TRUE,
            ],
            'unit_price' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2',
                'default'    => 0.00,
            ],
            'total_cost' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2',
                'default'    => 0.00,
            ],
            'date_acquired' => [
                'type'       => 'DATE',
                'null'       => TRUE,
            ],
            'created_at' => [
                'type'       => 'DATETIME',
                'null'       => TRUE,
            ],
            'updated_at' => [
                'type'       => 'DATETIME',
                'null'       => TRUE,
            ],
        ]);

        $this->_lava->dbforge->add_key('id', TRUE);
        $this->_lava->dbforge->add_key('farm_act_id'); // Idinagdag bilang Index para ihanda sa Foreign Key
        $this->_lava->dbforge->create_table('farm_inventory');
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('farm_inventory');
    }
}