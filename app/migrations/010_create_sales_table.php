<?php

class Create_sales_table {

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
            'transaction_code' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Halimbawa: SALE-2026-001[cite: 6]
            ],
            'orders_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => TRUE,
                'null'       => TRUE, // Foreign key galing sa orders table (kung online order)
            ],
            'mill_inventory_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => TRUE,
                'null'       => TRUE, // Foreign key galing sa mill_inventory para sa stock deduction
            ],
            'customer_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 150, // Halimbawa: Juan Dela Cruz, Walk-in Customer[cite: 6]
            ],
            'product_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 255, // Halimbawa: Premium Rice 25kg[cite: 6]
            ],
            'payment_method' => [
                'type'       => 'VARCHAR',
                'constraint' => 100, // Halimbawa: Cash, GCash[cite: 6]
            ],
            'sale_date' => [
                'type'       => 'DATE',  // Petsa ng benta[cite: 6]
                'null'       => TRUE,
            ],
            'amount' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', // Kabuuang halaga (hal. ₱2,600)[cite: 6]
                'default'    => 0.00,
            ],
            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Halimbawa: Paid[cite: 6]
                'default'    => 'Paid',
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
        $this->_lava->dbforge->add_key('orders_id');         // Index para sa orders relationship
        $this->_lava->dbforge->add_key('mill_inventory_id'); // Index para sa inventory relationship
        $this->_lava->dbforge->create_table('sales');
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('sales');
    }
}