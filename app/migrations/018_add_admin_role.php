<?php

class Add_admin_role
{
    private $_lava;

    public function __construct()
    {
        $this->_lava = lava_instance();
    }

    public function up()
    {
        $this->_lava->db->raw(
            "ALTER TABLE `users` MODIFY COLUMN `role` " .
            "ENUM('super_admin','admin','section_admin','customer') NOT NULL DEFAULT 'customer'"
        );
    }

    public function down()
    {
        $this->_lava->db->raw("UPDATE `users` SET `role` = 'super_admin' WHERE `role` = 'admin'");
        $this->_lava->db->raw(
            "ALTER TABLE `users` MODIFY COLUMN `role` " .
            "ENUM('super_admin','section_admin','customer') NOT NULL DEFAULT 'customer'"
        );
    }
}
