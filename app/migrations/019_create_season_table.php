
<?php

class Create_season_table {

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
                'type'       => 'VARCHAR',
                'constraint' => 50,
            ],
            'season_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 100,
            ],
            'season_type' => [
                'type'       => 'VARCHAR',
                'constraint' => 30, // Wet or Dry
            ],
            'start_date' => [
                'type' => 'DATE',
            ],
            'end_date' => [
                'type' => 'DATE',
            ],
            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 30,
                'default'    => 'Upcoming',
            ],
            'description' => [
                'type' => 'TEXT',
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
        $this->_lava->dbforge->add_key('season_id', FALSE, TRUE);

        $this->_lava->dbforge->create_table('seasons');
    }

    public function down()
    {
        $this->_lava->dbforge->drop_table('seasons');
    }
}
