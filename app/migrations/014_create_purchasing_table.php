<?php

class Create_purchasing_table {

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
            'batch_code' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Halimbawa: PUR-1001[cite: 3]
            ],
            'supplier_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 150, // Pangalan ng Magsasaka/Supplier (hal. Juan Dela Cruz)[cite: 3]
            ],
            'purchase_date' => [
                'type'       => 'DATE',  // Petsa ng pagbili[cite: 3]
                'null'       => TRUE,
            ],
            'quantity_kg' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', // Dami sa kilo (hal. 1,200 kg)[cite: 3]
                'default'    => 0.00,
            ],
            'price_per_kg' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', // Presyo kada kilo (hal. ₱22.50)[cite: 3]
                'default'    => 0.00,
            ],
            'total_amount' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', // Kabuuang halaga (hal. ₱27,000)[cite: 3]
                'default'    => 0.00,
            ],
            'moisture_content' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Halimbawa: "24%"[cite: 3]
                'null'       => TRUE,
            ],
            'payment_status' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Paid, Partial, Unpaid[cite: 3]
                'default'    => 'Unpaid',
            ],
            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Completed, Pending[cite: 3]
                'default'    => 'Pending',
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
        $this->_lava->dbforge->create_table('palay_purchasing');
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('palay_purchasing');
    }
}