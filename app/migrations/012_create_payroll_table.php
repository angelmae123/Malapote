<?php

class Create_payroll_table {

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
            'payroll_id' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  
            ],
            'farmers_workers_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => TRUE,
                'null'       => TRUE, 
            ],
            'worker_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 150, 
            ],
            'employment_type' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  
                'default'    => 'Daily',
            ],
            'rate' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', 
                'default'    => 0.00,
            ],
            'days' => [
                'type'       => 'DECIMAL',
                'constraint' => '5,1',  
                'default'    => 0.0,
            ],
            'gross' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', 
                'default'    => 0.00,
            ],
            'advance' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', 
                'default'    => 0.00,
            ],
            'net' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', 
                'default'    => 0.00,
            ],
            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  
                'default'    => 'Pending',
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
        $this->_lava->dbforge->add_key('farmers_workers_id'); // Idinagdag natin bilang Index para sa mabilis na pag-uugnay
        $this->_lava->dbforge->create_table('payroll');
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('payroll');
    }
}