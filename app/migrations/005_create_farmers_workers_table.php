<?php

class Create_farmers_workers_table {

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
            'name' => [
                'type'       => 'VARCHAR',
                'constraint' => 150, // Pangalan ng Magsasaka o Manggagawa (hal. Juan Dela Cruz)
            ],
            'role' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Opsyonal: Kung Farmer ba o Farm Worker/Laborer
                'null'       => TRUE,
            ],
            'contact_no' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Numero ng telepono o cellphone number
                'null'       => TRUE,
            ],
            'days_of_work' => [
                'type'       => 'DECIMAL',
                'constraint' => '5,1',  // Kayang mag-save ng whole days o half-day (hal. 3.5 days o 5 days)
                'default'    => 0.0,
            ],
            'season' => [
                'type'       => 'VARCHAR',
                'constraint' => 100, // Para malaman kung anong season sila nagtrabaho (para madaling i-filter)
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
        $this->_lava->dbforge->create_table('farmers_workers');
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('farmers_workers');
    }
}