<?php

class Create_reports_table
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

            'week_range' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
            ],

            'start_date' => [
                'type' => 'DATE',
                'null' => TRUE,
            ],

            'end_date' => [
                'type' => 'DATE',
                'null' => TRUE,
            ],

            'total_sales' => [
                'type'       => 'DECIMAL',
                'constraint' => '12,2',
                'default'    => 0.00,
            ],

            'total_production' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2',
                'default'    => 0.00,
            ],

            'generated_date' => [
                'type' => 'DATE',
                'null' => TRUE,
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
        $this->_lava->dbforge->create_table('weekly_reports');
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('weekly_reports');
    }
}