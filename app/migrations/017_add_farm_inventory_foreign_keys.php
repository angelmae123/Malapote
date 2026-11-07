<?php

class Add_farm_inventory_foreign_keys {

    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
        $this->_lava->call->dbforge();
    }

    public function up()
    {
        $this->rename_legacy_planting_table();

        $this->add_foreign_key('refresh_tokens', 'fk_refresh_tokens_user_id', 'user_id', 'users', 'CASCADE');
        $this->add_foreign_key('farm_act', 'fk_farm_act_planting_harvesting', 'farm_planting_harvesting_id', 'farm_planting_harvesting');
        $this->add_foreign_key('farm_inventory', 'fk_farm_inventory_farm_act', 'farm_act_id', 'farm_act');
        $this->add_foreign_key('mill_inventory', 'fk_mill_inventory_milling_records', 'milling_records_id', 'milling_records');
        $this->add_foreign_key('orders', 'fk_orders_mill_inventory', 'mill_inventory_id', 'mill_inventory');
        $this->add_foreign_key('sales', 'fk_sales_orders', 'orders_id', 'orders');
        $this->add_foreign_key('sales', 'fk_sales_mill_inventory', 'mill_inventory_id', 'mill_inventory');
        $this->add_foreign_key('payroll', 'fk_payroll_farmers_workers', 'farmers_workers_id', 'farmers_workers');
        $this->add_foreign_key('products', 'fk_products_mill_inventory', 'mill_inventory_id', 'mill_inventory');
        $this->add_foreign_key('drying_records', 'fk_drying_records_palay_purchasing', 'palay_purchasing_id', 'palay_purchasing');
        $this->add_foreign_key('milling_records', 'fk_milling_records_palay_purchasing', 'palay_purchasing_id', 'palay_purchasing');
    }

    public function down()
    {
        $this->drop_foreign_key('milling_records', 'fk_milling_records_palay_purchasing');
        $this->drop_foreign_key('drying_records', 'fk_drying_records_palay_purchasing');
        $this->drop_foreign_key('products', 'fk_products_mill_inventory');
        $this->drop_foreign_key('payroll', 'fk_payroll_farmers_workers');
        $this->drop_foreign_key('sales', 'fk_sales_mill_inventory');
        $this->drop_foreign_key('sales', 'fk_sales_orders');
        $this->drop_foreign_key('orders', 'fk_orders_mill_inventory');
        $this->drop_foreign_key('mill_inventory', 'fk_mill_inventory_milling_records');
        $this->drop_foreign_key('farm_inventory', 'fk_farm_inventory_farm_act');
        $this->drop_foreign_key('farm_act', 'fk_farm_act_planting_harvesting');
        $this->drop_foreign_key('refresh_tokens', 'fk_refresh_tokens_user_id');

        $legacy_exists = $this->_lava->dbforge->table_exists('farm_panting_harvesting');
        $correct_exists = $this->_lava->dbforge->table_exists('farm_planting_harvesting');

        if ($legacy_exists && $correct_exists) {
            throw new RuntimeException('Both legacy and corrected planting/harvesting tables exist; resolve the duplicate before rolling back.');
        }

        if ($correct_exists) {
            $this->_lava->dbforge->rename_table('farm_planting_harvesting', 'farm_panting_harvesting');
        }
    }

    private function rename_legacy_planting_table()
    {
        $legacy_exists = $this->_lava->dbforge->table_exists('farm_panting_harvesting');
        $correct_exists = $this->_lava->dbforge->table_exists('farm_planting_harvesting');

        if ($legacy_exists && $correct_exists) {
            throw new RuntimeException('Both legacy and corrected planting/harvesting tables exist; resolve the duplicate before migrating.');
        }

        if ($legacy_exists) {
            $this->_lava->dbforge->rename_table('farm_panting_harvesting', 'farm_planting_harvesting');
        }
    }

    private function add_foreign_key($table, $name, $column, $reference_table, $on_delete = 'SET NULL')
    {
        if ($this->foreign_key_exists($table, $name)) {
            return;
        }

        $this->_lava->db->raw(
            "ALTER TABLE `{$table}` ADD CONSTRAINT `{$name}` FOREIGN KEY (`{$column}`) " .
            "REFERENCES `{$reference_table}` (`id`) ON DELETE {$on_delete} ON UPDATE CASCADE"
        );
    }

    private function drop_foreign_key($table, $name)
    {
        if (!$this->foreign_key_exists($table, $name)) {
            return;
        }

        $this->_lava->db->raw("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$name}`");
    }

    private function foreign_key_exists($table, $name)
    {
        $statement = $this->_lava->db->raw(
            'SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS ' .
            'WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = :table AND CONSTRAINT_NAME = :name',
            ['table' => $table, 'name' => $name]
        );

        return (int) $statement->fetchColumn() > 0;
    }
}
