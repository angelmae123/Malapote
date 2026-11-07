<?php

class Create_orders_table {

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
            'order_code' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Halimbawa: ORD-2026-001[cite: 6]
            ],
            'mill_inventory_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => TRUE,
                'null'       => TRUE, // Foreign key galing sa mill_inventory para sa stock ugnayan
            ],
            'customer_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 150, // Pangalan ng customer (hal. Juan Dela Cruz)[cite: 6]
            ],
            'items_ordered' => [
                'type'       => 'TEXT',   // Mga biniling item (hal. "Premium Rice 25kg × 2")[cite: 6]
            ],
            'payment_method' => [
                'type'       => 'VARCHAR',
                'constraint' => 100, // Paraan ng pagbabayad (hal. Cash on Delivery, GCash)[cite: 6]
            ],
            'order_date' => [
                'type'       => 'DATE',  // Petsa ng order[cite: 6]
                'null'       => TRUE,
            ],
            'total_amount' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', // Kabuuang halaga (hal. ₱2,500)[cite: 6]
                'default'    => 0.00,
            ],
            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Estado ng order: Pending, Processing, Completed[cite: 6]
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
        $this->_lava->dbforge->add_key('mill_inventory_id'); // Idinagdag para magsilbing index
        $this->_lava->dbforge->create_table('orders');
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('orders');
    }
}