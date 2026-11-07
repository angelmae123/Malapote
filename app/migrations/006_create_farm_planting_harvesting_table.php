<?php

class Create_farm_planting_harvesting_table {

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
            'record_code' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Para sa ID code tulad ng "PL-001" sa UI mo
                'null'       => TRUE,
            ],
            'season' => [
                'type'       => 'VARCHAR',
                'constraint' => 100, // Para maitala kung anong season (Wet Season / Dry Season)
                'null'       => TRUE,
            ],
            'field_name' => [
                'type'       => 'VARCHAR',
                'constraint' => 100, // Halimbawa: Field 1, Field 2, Field A
            ],
            'crop' => [
                'type'       => 'VARCHAR',
                'constraint' => 100, // Halimbawa: Palay
                'default'    => 'Palay',
            ],
            'method' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Paraan ng pagtatanim: Halimbawa ay Hasik, Talok, SRI
                'null'       => TRUE,
            ],
            'planting_date' => [
                'type'       => 'DATE',  // Eksaktong petsa ng pagtatanim
                'null'       => TRUE,
            ],
            'expected_harvest_date' => [
                'type'       => 'DATE',  // Inaasahang petsa ng anihan
                'null'       => TRUE,
            ],
            'harvested_yield' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2', // Timbang o dami ng naani (hal. 6.20 tons)
                'default'    => 0.00,
            ],
            'status' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,  // Estado: Growing, Harvested, o Planned
                'default'    => 'Planned',
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
        $this->_lava->dbforge->create_table('farm_planting_harvesting');
    }

    public function down()
    {
        $legacy_exists = $this->_lava->dbforge->table_exists('farm_panting_harvesting');
        $correct_exists = $this->_lava->dbforge->table_exists('farm_planting_harvesting');

        if ($legacy_exists && $correct_exists) {
            throw new RuntimeException('Both legacy and corrected planting/harvesting tables exist; resolve the duplicate before rolling back.');
        }

        if ($correct_exists) {
            $this->_lava->dbforge->drop_table('farm_planting_harvesting');
        } elseif ($legacy_exists) {
            $this->_lava->dbforge->drop_table('farm_panting_harvesting');
        }
    }
}