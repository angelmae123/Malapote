<?php

class Create_milling_table {

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
            'milling_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Halimbawa: MIL-3001[cite: 5]
            ],
            'palay_purchasing_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => TRUE,
                'null'       => TRUE, // Foreign key galing sa id ng palay_purchasing table
            ],
            'batch_code' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Halimbawa: PUR-1001[cite: 5]
            ],
            'milling_date' => [
                'type'       => 'DATE',  // Petsa ng pag-giling[cite: 5]
                'null'       => TRUE,
            ],
            'dried_input_kg' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', 
                'default'    => 0.00,
            ],
            'rice_output_kg' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', 
                'default'    => 0.00,
            ],
            'bran_kg' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', 
                'default'    => 0.00,
            ],
            'broken_rice_kg' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', 
                'default'    => 0.00,
            ],
            'recovery_rate' => [
                'type'       => 'VARCHAR',
                'constraint' => 20,  // Halimbawa: "63.0%"[cite: 5]
                'null'       => TRUE,
            ],
            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Completed, Pending[cite: 5]
                'default'    => 'Completed',
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
        $this->_lava->dbforge->create_table('milling_records');
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('milling_records');
    }
}