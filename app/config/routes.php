<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/*
| -------------------------------------------------------------------
| URI ROUTING
| -------------------------------------------------------------------
*/

/** @var object $router **/

$router->get('/', 'Welcome::index');

// =========================================================
// AUTHENTICATION ROUTES
// =========================================================

$router->post('api/auth/register', 'AuthController::register');
$router->post('api/auth/login', 'AuthController::login');
$router->post('api/auth/logout', 'AuthController::logout');
$router->post('api/auth/refresh', 'AuthController::refresh');
$router->get('api/auth/sections/{section}', 'AuthController::section_access');

// =========================================================
// SEASON ROUTES
// =========================================================

$router->get('api/seasons', 'SeasonsController::index');
$router->get('api/seasons/(:any)', 'SeasonsController::show');
$router->post('api/seasons', 'SeasonsController::store');
$router->put('api/seasons/(:any)', 'SeasonsController::update');
$router->delete('api/seasons/(:any)', 'SeasonsController::destroy');

// =========================================================
// FARM ROUTES
// =========================================================

// Farm Activities
$router->get('api/farm/activities', 'FarmController::farm_activities');
$router->post('api/farm/activities', 'FarmController::add_farm_activity');
$router->get('api/farm/activities/{id}', 'FarmController::farm_activity');
$router->put('api/farm/activities/{id}', 'FarmController::update_farm_activity');
$router->delete('api/farm/activities/{id}', 'FarmController::delete_farm_activity');

// Farm Inventory
$router->get('api/farm/inventory', 'FarmController::farm_inventory');
$router->post('api/farm/inventory', 'FarmController::add_farm_inventory');
$router->get('api/farm/inventory/{id}', 'FarmController::farm_inventory_item');
$router->put('api/farm/inventory/{id}', 'FarmController::update_farm_inventory');
$router->delete('api/farm/inventory/{id}', 'FarmController::delete_farm_inventory');

// Planting and Harvesting
$router->get('api/farm/planting-harvesting', 'FarmController::planting_harvesting');
$router->post('api/farm/planting-harvesting', 'FarmController::add_planting_harvesting');
$router->get('api/farm/planting-harvesting/{id}', 'FarmController::planting_harvesting_record');
$router->put('api/farm/planting-harvesting/{id}', 'FarmController::update_planting_harvesting');
$router->delete('api/farm/planting-harvesting/{id}', 'FarmController::delete_planting_harvesting');


// =========================================================
// FARM INPUT / FERTILIZER APPLICATION ROUTES
// =========================================================

$router->get(
    'api/farm/input-applications',
    'FarmController::input_applications'
);

$router->post(
    'api/farm/input-applications',
    'FarmController::add_input_application'
);

$router->get(
    'api/farm/input-applications/cycle/{id}',
    'FarmController::input_applications_by_cycle'
);

$router->get(
    'api/farm/input-applications/totals/{id}',
    'FarmController::input_application_totals'
);

$router->get(
    'api/farm/input-applications/{id}',
    'FarmController::input_application'
);

$router->put(
    'api/farm/input-applications/{id}',
    'FarmController::update_input_application'
);

$router->delete(
    'api/farm/input-applications/{id}',
    'FarmController::delete_input_application'
);

// =========================================================
//machine learning routes
// =========================================================
$router->post(
    'api/farm/palay-prediction',
    'FarmController::palay_prediction'
);
// =========================================================
// MILL ROUTES
// =========================================================

// Purchasing
$router->get('api/mill/purchasing', 'MillController::purchasing');
$router->post('api/mill/purchasing', 'MillController::add_purchasing');
$router->get('api/mill/purchasing/{id}', 'MillController::purchasing_record');
$router->put('api/mill/purchasing/{id}', 'MillController::update_purchasing');
$router->delete('api/mill/purchasing/{id}', 'MillController::delete_purchasing');

// Drying
$router->get('api/mill/drying', 'MillController::drying');
$router->post('api/mill/drying', 'MillController::add_drying');
$router->get('api/mill/drying/{id}', 'MillController::drying_record');
$router->put('api/mill/drying/{id}', 'MillController::update_drying');
$router->delete('api/mill/drying/{id}', 'MillController::delete_drying');

// Milling
$router->get('api/mill/milling', 'MillController::milling');
$router->post('api/mill/milling', 'MillController::add_milling');
$router->get('api/mill/milling/{id}', 'MillController::milling_record');
$router->put('api/mill/milling/{id}', 'MillController::update_milling');
$router->delete('api/mill/milling/{id}', 'MillController::delete_milling');

// Mill Inventory
$router->get('api/mill/inventory', 'MillController::inventory');
$router->post('api/mill/inventory', 'MillController::add_inventory');
$router->get('api/mill/inventory/{id}', 'MillController::inventory_record');
$router->put('api/mill/inventory/{id}', 'MillController::update_inventory');
$router->delete('api/mill/inventory/{id}', 'MillController::delete_inventory');

// =========================================================
// OFFICE: FARMERS & WORKERS
// =========================================================

$router->get('api/office/farmers-workers', 'OfficeController::farmers_workers');
$router->post('api/office/farmers-workers', 'OfficeController::add_farmer_worker');
$router->get('api/office/farmers-workers/{id}', 'OfficeController::farmer_worker');
$router->put('api/office/farmers-workers/{id}', 'OfficeController::update_farmer_worker');
$router->delete('api/office/farmers-workers/{id}', 'OfficeController::delete_farmer_worker');

// =========================================================
// OFFICE: PAYROLL PERIODS
// =========================================================

// Get all monthly payroll periods
$router->get(
    'api/office/payroll-periods',
    'OfficeController::payroll_periods'
);

// Get or create the current month's payroll period
$router->get(
    'api/office/payroll-current-period',
    'OfficeController::current_payroll_period'
);

// =========================================================
// OFFICE: PAYROLL RECORDS
// =========================================================

// Get all payroll records
$router->get('api/office/payroll', 'OfficeController::payroll');

// Add payroll record
$router->post('api/office/payroll', 'OfficeController::add_payroll');

// Get one payroll record
$router->get('api/office/payroll/{id}', 'OfficeController::payroll_record');

// Update payroll record
$router->put('api/office/payroll/{id}', 'OfficeController::update_payroll');

// Delete payroll record
$router->delete('api/office/payroll/{id}', 'OfficeController::delete_payroll');

// =========================================================
// SALES: ORDERS
// =========================================================

$router->get('api/sales/orders', 'SalesController::orders');
$router->post('api/sales/orders', 'SalesController::add_order');
$router->get('api/sales/orders/{id}', 'SalesController::order');
$router->put('api/sales/orders/{id}', 'SalesController::update_order');
$router->delete('api/sales/orders/{id}', 'SalesController::delete_order');

// Sales report preview
$router->post('api/sales/reports/preview', 'SalesController::preview_report');

// =========================================================
// SALES: TRANSACTIONS
// =========================================================

$router->get('api/sales/transactions', 'SalesController::transactions');
$router->post('api/sales/transactions', 'SalesController::add_transaction');
$router->get('api/sales/transactions/{id}', 'SalesController::transaction');
$router->put('api/sales/transactions/{id}', 'SalesController::update_transaction');
$router->delete('api/sales/transactions/{id}', 'SalesController::delete_transaction');

// =========================================================
// SALES: PRODUCTS
// =========================================================

$router->get('api/sales/products', 'SalesController::products');
$router->post('api/sales/products', 'SalesController::add_product');
$router->get('api/sales/products/{id}', 'SalesController::product');
$router->put('api/sales/products/{id}', 'SalesController::update_product');
$router->delete('api/sales/products/{id}', 'SalesController::delete_product');

// =========================================================
// SHOP ROUTES
// =========================================================

$router->get('api/shop/products', 'ShopController::products');
$router->get('api/shop/shipping-rates', 'ShopController::shipping_rates');
$router->post('api/shop/checkout', 'ShopController::checkout');
$router->get('api/shop/my-orders', 'ShopController::my_orders');
$router->post('api/shop/orders/{id}/cancel', 'ShopController::cancel_order');

// =========================================================
// SHOP PROFILE ROUTES
// =========================================================

$router->get('api/shop/profile', 'ProfileController::show');
$router->put('api/shop/profile', 'ProfileController::update');

// =========================================================
// SALES REPORTS ROUTES
// =========================================================

$router->get('api/sales/reports', 'SalesController::reports');
$router->post('api/sales/reports', 'SalesController::add_report');
$router->get('api/sales/reports/{id}', 'SalesController::report');
$router->put('api/sales/reports/{id}', 'SalesController::update_report');
$router->delete('api/sales/reports/{id}', 'SalesController::delete_report');

// =========================================================
// SHIPPING RATE MANAGEMENT ROUTES
// =========================================================

$router->get('api/shipping-rates', 'ShippingRateController::index');
$router->get('api/shipping-rates/{id}', 'ShippingRateController::show');
$router->post('api/shipping-rates', 'ShippingRateController::store');
$router->put('api/shipping-rates/{id}', 'ShippingRateController::update');
$router->delete('api/shipping-rates/{id}', 'ShippingRateController::delete');

// =========================================================
// MIGRATION ROUTES
// =========================================================

$router->get('create-migration/{migration_class}', 'MigrationController::create_migration');
$router->get('migrate', 'MigrationController::migrate');
$router->get('rollback', 'MigrationController::rollback');
$router->get('rollback-all', 'MigrationController::rollback_all');
$router->get('refresh', 'MigrationController::refresh');
$router->get('status', 'MigrationController::status');
