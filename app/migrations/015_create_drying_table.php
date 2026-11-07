<?php

class Create_drying_table {

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
            'drying_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Halimbawa: DRY-2001[cite: 4]
            ],
            'palay_purchasing_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => TRUE,
                'null'       => TRUE, // Foreign key galing sa id ng palay_purchasing table
            ],
            'batch_code' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Halimbawa: PUR-1001[cite: 4]
            ],
            'start_date' => [
                'type'       => 'DATE',  // Petsa ng simula ng pagpapatuyo[cite: 4]
                'null'       => TRUE,
            ],
            'end_date' => [
                'type'       => 'DATE',  // Petsa ng tapos[cite: 4]
                'null'       => TRUE,
            ],
            'start_weight_kg' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', 
                'default'    => 0.00,
            ],
            'moisture_change' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Halimbawa: "24% -> 14%"[cite: 4]
                'null'       => TRUE,
            ],
            'final_weight_kg' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', 
                'default'    => 0.00,
            ],
            'drying_cost' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', 
                'default'    => 0.00,
            ],
            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Completed, In Progress[cite: 4]
                'default'    => 'In Progress',
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
        $this->_lava->dbforge->add_key('palay_purchasing_id'); // Idinagdag bilang index para sa foreign key
        $this->_lava->dbforge->create_table('drying_records');
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('drying_records');
    }
}