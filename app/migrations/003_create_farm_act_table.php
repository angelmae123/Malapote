<?php

class Create_farm_act_table {

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
            'farm_planting_harvesting_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => TRUE,
                'null'       => TRUE, // Foreign key para sa planting/harvesting record
            ],
            'season' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
            ],
            'area' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
            ],
            'activity' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
            ],
            'type_of_seedling' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
                'null'       => TRUE,
            ],
            'fertilizers' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => TRUE,
            ],
            'antipesticide' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => TRUE,
            ],
            'date' => [
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
        $this->_lava->dbforge->add_key('farm_planting_harvesting_id'); // Index para sa mabilis na ugnayan sa planting
        $this->_lava->dbforge->create_table('farm_act');
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('farm_act');
    }
}