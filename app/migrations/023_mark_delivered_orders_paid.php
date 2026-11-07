<?php

class Mark_delivered_orders_paid
{
    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
    }

    public function up()
    {
        $this->_lava->db->raw(
            "UPDATE `orders`
             SET `payment_status` = 'Paid'
             WHERE LOWER(TRIM(`status`)) = 'delivered'"
        );
    }

    public function down()
    {
        // Payment status is intentionally not reset during rollback because it
        // may have been confirmed independently of the order delivery status.
    }
}
