<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class FarmController extends Controller
{
    private $farm_act_model;
    private $inventory_model;
    private $planting_model;
    private $api;

    public function __construct()
    {
        parent::__construct();
        $this->db = $this->call->database();
        $this->farm_act_model = $this->call->model('FarmActModel');
        $this->inventory_model = $this->call->model('FInventoryModel');
        $this->planting_model = $this->call->model('PlantingModel');
        $this->api = $this->call->library('api');
    }

    public function farm_activities()
    {
        $this->api->require_method('GET');
        $this->api->rate_limit('farm_activities', 120, 60);
        $this->authorize_farm_access();
        $this->api->respond($this->farm_act_model->_all());
    }

    public function farm_activity($id)
    {
        $this->api->require_method('GET');
        $this->authorize_farm_access();
        $this->api->respond($this->find_record($this->farm_act_model, $id, 'Farm activity'));
    }

    public function add_farm_activity()
    {
        $this->api->require_method('POST');
        $this->api->rate_limit('farm_add_activity', 30, 60);
        $this->authorize_farm_access();

        $input = $this->api->body();
        $this->require_fields($input, [
            'farm_planting_harvesting_id', 'season', 'area', 'activity',
            'type_of_seedling', 'fertilizers', 'antipesticide', 'date',
        ]);
        $data = $this->activity_data($input);
        $id = $this->farm_act_model->_insert($data);

        if ($id === false) {
            $this->api->respond_error('Unable to add farm activity.', 500);
        }

        $this->api->respond(['message' => 'Farm activity added successfully.', 'id' => $id], 201);
    }

    public function update_farm_activity($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_farm_access();
        $current = $this->find_record($this->farm_act_model, $id, 'Farm activity');
        $input = $this->api->body();
        $this->require_fields($input, [
            'farm_planting_harvesting_id', 'season', 'area', 'activity',
            'type_of_seedling', 'fertilizers', 'antipesticide', 'date',
        ]);

        $this->farm_act_model->_update((int) $current['id'], $this->activity_data($input, $current));
        $this->api->respond(['message' => 'Farm activity updated successfully.']);
    }

    public function delete_farm_activity($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_farm_access();
        $record = $this->find_record($this->farm_act_model, $id, 'Farm activity');
        $this->farm_act_model->_delete((int) $record['id']);
        $this->api->respond(['message' => 'Farm activity deleted successfully.']);
    }

    public function farm_inventory()
    {
        $this->api->require_method('GET');
        $this->api->rate_limit('farm_inventory', 120, 60);
        $this->authorize_farm_access();
        $this->api->respond($this->inventory_model->_all());
    }

    public function farm_inventory_item($id)
    {
        $this->api->require_method('GET');
        $this->authorize_farm_access();
        $this->api->respond($this->find_record($this->inventory_model, $id, 'Farm inventory item'));
    }

    public function add_farm_inventory()
    {
        $this->api->require_method('POST');
        $this->api->rate_limit('farm_add_inventory', 30, 60);
        $this->authorize_farm_access();

        $input = $this->api->body();
        $this->require_fields($input, [
            'season_id', 'farm_act_id', 'item_category', 'item_name',
            'quantity', 'unit', 'unit_price', 'date_acquired',
        ]);
        $data = $this->inventory_data($input);
        $id = $this->inventory_model->_insert($data);

        if ($id === false) {
            $this->api->respond_error('Unable to add farm inventory item.', 500);
        }

        $this->api->respond(['message' => 'Farm inventory item added successfully.', 'id' => $id], 201);
    }

    public function update_farm_inventory($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_farm_access();
        $current = $this->find_record($this->inventory_model, $id, 'Farm inventory item');
        $input = $this->api->body();
        $fields = [
            'season_id', 'farm_act_id', 'item_category', 'item_name',
            'quantity', 'unit', 'unit_price', 'date_acquired',
        ];
        $this->require_fields($input, $fields);

        $data = $this->inventory_data($input, $current);
        if (array_key_exists('quantity', $input) || array_key_exists('unit_price', $input)) {
            $data['total_cost'] = round((float) $data['quantity'] * (float) $data['unit_price'], 2);
        }
        $this->inventory_model->_update((int) $current['id'], $data);
        $this->api->respond(['message' => 'Farm inventory item updated successfully.']);
    }

    public function delete_farm_inventory($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_farm_access();
        $record = $this->find_record($this->inventory_model, $id, 'Farm inventory item');
        $this->inventory_model->_delete((int) $record['id']);
        $this->api->respond(['message' => 'Farm inventory item deleted successfully.']);
    }

    public function planting_harvesting()
    {
        $this->api->require_method('GET');
        $this->api->rate_limit('farm_planting_harvesting', 120, 60);
        $this->authorize_farm_access();
        $this->api->respond($this->planting_model->_all());
    }

    public function planting_harvesting_record($id)
    {
        $this->api->require_method('GET');
        $this->authorize_farm_access();
        $this->api->respond($this->find_record($this->planting_model, $id, 'Planting/harvesting record'));
    }

    public function add_planting_harvesting()
    {
        $this->api->require_method('POST');
        $this->api->rate_limit('farm_add_planting_harvesting', 30, 60);
        $this->authorize_farm_access();

        $input = $this->api->body();
        $this->require_fields($input, [
            'record_code', 'season', 'field_name', 'crop', 'method',
            'planting_date', 'expected_harvest_date', 'harvested_yield', 'status',
        ]);
        $id = $this->planting_model->_insert($this->planting_data($input));

        if ($id === false) {
            $this->api->respond_error('Unable to add planting/harvesting record.', 500);
        }

        $this->api->respond(['message' => 'Planting/harvesting record added successfully.', 'id' => $id], 201);
    }

    public function update_planting_harvesting($id)
    {
        $this->api->require_method('PUT');
        $this->authorize_farm_access();
        $current = $this->find_record($this->planting_model, $id, 'Planting/harvesting record');
        $input = $this->api->body();
        $this->require_fields($input, [
            'record_code', 'season', 'field_name', 'crop', 'method',
            'planting_date', 'expected_harvest_date', 'harvested_yield', 'status',
        ]);

        $this->planting_model->_update((int) $current['id'], $this->planting_data($input, $current));
        $this->api->respond(['message' => 'Planting/harvesting record updated successfully.']);
    }

    public function delete_planting_harvesting($id)
    {
        $this->api->require_method('DELETE');
        $this->authorize_farm_access();
        $record = $this->find_record($this->planting_model, $id, 'Planting/harvesting record');
        $this->planting_model->_delete((int) $record['id']);
        $this->api->respond(['message' => 'Planting/harvesting record deleted successfully.']);
    }

    private function activity_data(array $input, array $current = [])
    {
        $data = [];
        $planting_id = $this->optional_id($input, $current, 'farm_planting_harvesting_id');
        if ($planting_id !== null && !$this->record_exists('farm_planting_harvesting', $planting_id)) {
            $this->api->respond_error('Planting/harvesting record not found.', 422);
        }
        $data['farm_planting_harvesting_id'] = $planting_id;
        $data['season'] = $this->string_value($input, $current, 'season', 'Season', 100, true);
        $data['area'] = $this->string_value($input, $current, 'area', 'Area', 100, true);
        $data['activity'] = $this->string_value($input, $current, 'activity', 'Activity', 100, true);
        $data['type_of_seedling'] = $this->string_value($input, $current, 'type_of_seedling', 'Type of seedling', 100, false);
        $data['fertilizers'] = $this->string_value($input, $current, 'fertilizers', 'Fertilizers', 255, false);
        $data['antipesticide'] = $this->string_value($input, $current, 'antipesticide', 'Antipesticide', 255, false);
        $data['date'] = $this->date_value($input, $current, 'date', 'Activity date');
        return $data;
    }

    private function inventory_data(array $input, array $current = [])
    {
        $data = [];
        $data['season_id'] = $this->validate_season_id($input, $current);
        $farm_act_id = $this->optional_id($input, $current, 'farm_act_id');
        if ($farm_act_id !== null && !$this->record_exists('farm_act', $farm_act_id)) {
            $this->api->respond_error('Farm activity not found.', 422);
        }
        $data['farm_act_id'] = $farm_act_id;
        $data['item_category'] = $this->string_value($input, $current, 'item_category', 'Item category', 50, true);
        $data['item_name'] = $this->string_value($input, $current, 'item_name', 'Item name', 150, true);
        $data['quantity'] = $this->number_value($input, $current, 'quantity', 'Quantity', 0);
        $data['unit'] = $this->string_value($input, $current, 'unit', 'Unit', 50, false);
        $data['unit_price'] = $this->number_value($input, $current, 'unit_price', 'Unit price', 0);
        $data['total_cost'] = round($data['quantity'] * $data['unit_price'], 2);
        $data['date_acquired'] = $this->date_value($input, $current, 'date_acquired', 'Date acquired');
        return $data;
    }

    private function planting_data(array $input, array $current = [])
    {
        return [
            'record_code' => $this->string_value($input, $current, 'record_code', 'Record code', 50, false),
            'season' => $this->string_value($input, $current, 'season', 'Season', 100, false),
            'field_name' => $this->string_value($input, $current, 'field_name', 'Field name', 100, true),
            'crop' => $this->string_value($input, $current, 'crop', 'Crop', 100, true, 'Palay'),
            'method' => $this->string_value($input, $current, 'method', 'Planting method', 50, false),
            'planting_date' => $this->date_value($input, $current, 'planting_date', 'Planting date'),
            'expected_harvest_date' => $this->date_value($input, $current, 'expected_harvest_date', 'Expected harvest date'),
            'harvested_yield' => $this->number_value($input, $current, 'harvested_yield', 'Harvested yield', 0),
            'status' => $this->string_value($input, $current, 'status', 'Status', 50, true, 'Planned'),
        ];
    }

    private function find_record($model, $id, $label)
    {
        if (!is_scalar($id) || !ctype_digit((string) $id) || (int) $id < 1) {
            $this->api->respond_error('A valid record ID is required.', 422);
        }

        $record = $model->_find((int) $id);
        if (!$record) {
            $this->api->respond_error($label . ' not found.', 404);
        }
        return $record;
    }

    private function require_fields(array $input, array $fields)
    {
        if (!array_intersect($fields, array_keys($input))) {
            $this->api->respond_error('At least one supported field is required.', 422);
        }
    }

    private function string_value(array $input, array $current, $key, $label, $max_length, $required, $default = null)
    {
        $value = array_key_exists($key, $input) ? $input[$key] : ($current[$key] ?? $default);
        if ($value === null || $value === '') {
            if ($required) {
                $this->api->respond_error($label . ' is required.', 422);
            }
            return null;
        }
        if (!is_string($value) || strlen($value) > $max_length || ($required && trim($value) === '')) {
            $this->api->respond_error($label . ' must be a non-empty value of at most ' . $max_length . ' characters.', 422);
        }
        return trim($value);
    }

    private function date_value(array $input, array $current, $key, $label)
    {
        $value = array_key_exists($key, $input) ? $input[$key] : ($current[$key] ?? null);
        if ($value === null || $value === '') {
            return null;
        }
        $date = is_string($value) ? DateTime::createFromFormat('!Y-m-d', $value) : false;
        if (!$date || $date->format('Y-m-d') !== $value) {
            $this->api->respond_error($label . ' must use YYYY-MM-DD format.', 422);
        }
        return $value;
    }

    private function number_value(array $input, array $current, $key, $label, $default)
    {
        $value = array_key_exists($key, $input) ? $input[$key] : ($current[$key] ?? $default);
        if (!is_numeric($value) || !is_finite((float) $value) || (float) $value < 0 || (float) $value > 99999999.99) {
            $this->api->respond_error($label . ' must be between 0 and 99999999.99.', 422);
        }
        return round((float) $value, 2);
    }

    private function optional_id(array $input, array $current, $key)
    {
        $value = array_key_exists($key, $input) ? $input[$key] : ($current[$key] ?? null);
        if ($value === null || $value === '') {
            return null;
        }
        if ((!is_string($value) && !is_int($value)) || !ctype_digit((string) $value) || (int) $value < 1) {
            $this->api->respond_error(ucwords(str_replace('_', ' ', $key)) . ' must be a positive integer.', 422);
        }
        return (int) $value;
    }

        private function validate_season_id($input, $current = [])
    {
        $value = $input['season_id'] ?? ($current['season_id'] ?? null);

        if ($value === null || $value === '') {
            return null;
        }

        if (!is_string($value) || strlen($value) > 50) {
            $this->api->respond_error('Invalid season ID.', 422);
        }

        $statement = $this->db->raw(
            'SELECT season_id FROM seasons WHERE season_id = ? LIMIT 1',
            [$value]
        );

        if ($statement->fetchColumn() === false) {
            $this->api->respond_error('Selected season does not exist.', 422);
        }

        return $value;
    }

    private function record_exists($table, $id)
    {
        $statement = $this->db->raw("SELECT id FROM {$table} WHERE id = ? LIMIT 1", [$id]);
        return $statement->fetchColumn() !== false;
    }

    private function authorize_farm_access()
    {
        $claims = $this->api->require_jwt();
        $statement = $this->db->raw(
            'SELECT role, section, is_active FROM users WHERE id = ? LIMIT 1',
            [$claims['sub']]
        );
        $user = $statement->fetch(PDO::FETCH_ASSOC);

        if (!$user || !(int) $user['is_active']) {
            $this->api->respond_error('Unauthorized.', 401);
        }

        if (!in_array($user['role'], ['admin'], true)
            && !($user['role'] === 'section_admin' && $user['section'] === 'farm')) {
            $this->api->respond_error('You are not authorized to access the farm section.', 403);
        }
    }
}
