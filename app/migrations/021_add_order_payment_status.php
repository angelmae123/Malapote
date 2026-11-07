<?php

class Add_order_payment_status
{
    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
    }

    public function up()
    {
        if (!$this->payment_status_column_exists()) {
            $this->_lava->db->raw(
                "ALTER TABLE `orders` ADD COLUMN `payment_status` " .
                "VARCHAR(20) NOT NULL DEFAULT 'Unpaid' AFTER `payment_method`"
            );
        }
    }

    public function down()
    {
        if ($this->payment_status_column_exists()) {
            $this->_lava->db->raw(
                "ALTER TABLE `orders` DROP COLUMN `payment_status`"
            );
        }
    }

    private function payment_status_column_exists()
    {
        $statement = $this->_lava->db->raw(
            'SELECT COUNT(*) FROM information_schema.COLUMNS ' .
            'WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table ' .
            'AND COLUMN_NAME = :column',
            ['table' => 'orders', 'column' => 'payment_status']
        );

        return (int) $statement->fetchColumn() > 0;
    }
}
