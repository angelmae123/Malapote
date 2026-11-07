<?php

class Recalculate_weekly_report_sales
{
    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
    }

    public function up()
    {
        $this->_lava->db->raw(
            "UPDATE weekly_reports wr
             SET total_sales =
                 COALESCE((
                     SELECT SUM(s.amount)
                     FROM sales s
                     WHERE s.sale_date >= wr.start_date
                       AND s.sale_date < DATE_ADD(wr.end_date, INTERVAL 1 DAY)
                       AND s.status = 'Paid'
                 ), 0) +
                 COALESCE((
                     SELECT SUM(o.total_amount)
                     FROM orders o
                     WHERE o.order_date >= wr.start_date
                       AND o.order_date < DATE_ADD(wr.end_date, INTERVAL 1 DAY)
                       AND o.payment_status = 'Paid'
                       AND COALESCE(LOWER(TRIM(o.status)), '') <> 'cancelled'
                       AND NOT EXISTS (
                           SELECT 1
                           FROM sales linked_sale
                           WHERE linked_sale.orders_id = o.id
                             AND linked_sale.status = 'Paid'
                       )
                 ), 0)
             WHERE wr.start_date IS NOT NULL
               AND wr.end_date IS NOT NULL"
        );
    }

    public function down()
    {
        $this->_lava->db->raw(
            "UPDATE weekly_reports wr
             SET total_sales = COALESCE((
                 SELECT SUM(s.amount)
                 FROM sales s
                 WHERE s.sale_date >= wr.start_date
                   AND s.sale_date < DATE_ADD(wr.end_date, INTERVAL 1 DAY)
                   AND s.status = 'Paid'
             ), 0)
             WHERE wr.start_date IS NOT NULL
               AND wr.end_date IS NOT NULL"
        );
    }
}
