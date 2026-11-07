<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class SeasonsController extends Controller
{
    private $timezone = 'Asia/Manila';

    public function __construct()
    {
        parent::__construct();

        $this->call->database();
        $this->call->model('SeasonsModel');
        $this->call->library('api');
    }

    /**
     * GET /api/seasons
     * Synchronize seasons and retrieve all records.
     */
    public function index()
    {
        try {
            $this->synchronize_seasons();

            $seasons = $this->SeasonsModel->all();

            $this->api->respond([
                'success' => true,
                'message' => 'Seasons retrieved successfully.',
                'data' => $seasons
            ], 200);
        } catch (Throwable $e) {
            $this->api->respond_error(
                'Unable to synchronize seasons: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * GET /api/seasons/sync
     * Dedicated endpoint for Windows Task Scheduler.
     */
    public function sync()
    {
        try {
            $result = $this->synchronize_seasons();

            $this->api->respond([
                'success' => true,
                'message' => 'Season synchronization completed.',
                'generated' => $result['generated'],
                'updated' => $result['updated'],
                'data' => $this->SeasonsModel->all()
            ], 200);
        } catch (Throwable $e) {
            $this->api->respond_error(
                'Season synchronization failed: ' . $e->getMessage(),
                500
            );
        }
    }

    /**
     * GET /api/seasons/{season_id}
     */
    public function show($season_id)
    {
        if (empty($season_id)) {
            $this->api->respond_error('Season ID is required.', 400);
            return;
        }

        $season = $this->SeasonsModel->find($season_id);

        if (!$season) {
            $this->api->respond_error('Season not found.', 404);
            return;
        }

        $this->api->respond([
            'success' => true,
            'message' => 'Season retrieved successfully.',
            'data' => $season
        ], 200);
    }

    /**
     * POST /api/seasons
     * Manual creation retained for administrative adjustments.
     */
    public function store()
    {
        $data = $this->request->json();

        if (!is_array($data)) {
            $this->api->respond_error('Invalid JSON request.', 400);
            return;
        }

        $season_name = trim($data['season_name'] ?? '');
        $season_type = strtoupper(trim($data['season_type'] ?? ''));
        $start_date = trim($data['start_date'] ?? '');
        $end_date = trim($data['end_date'] ?? '');
        $status = trim($data['status'] ?? 'Upcoming');
        $description = trim($data['description'] ?? '');

        if (
            $season_name === '' ||
            $season_type === '' ||
            $start_date === '' ||
            $end_date === ''
        ) {
            $this->api->respond_error(
                'Season name, type, start date, and end date are required.',
                422
            );
            return;
        }

        if (!in_array($season_type, ['WET', 'DRY'], true)) {
            $this->api->respond_error(
                'Season type must be WET or DRY.',
                422
            );
            return;
        }

        if (!$this->valid_date_range($start_date, $end_date)) {
            $this->api->respond_error(
                'Invalid dates. Use YYYY-MM-DD and ensure the end date is not earlier than the start date.',
                422
            );
            return;
        }

        if (!in_array($status, ['Upcoming', 'Ongoing', 'Completed'], true)) {
            $this->api->respond_error('Invalid season status.', 422);
            return;
        }

        // Prevent duplicate season type and start date.
        $existing = $this->find_by_type_and_start($season_type, $start_date);

        if ($existing) {
            $this->api->respond_error(
                'A season of this type with the same start date already exists.',
                409
            );
            return;
        }

        $season_id = $this->generate_season_id(
            $season_type,
            substr($start_date, 0, 4)
        );

        $now = $this->manila_now();

        $season_data = [
            'season_id' => $season_id,
            'season_name' => $season_name,
            'season_type' => $season_type,
            'start_date' => $start_date,
            'end_date' => $end_date,
            'status' => $this->calculate_status($start_date, $end_date),
            'description' => $description !== '' ? $description : null,
            'created_at' => $now,
            'updated_at' => $now
        ];

        $result = $this->SeasonsModel->insert($season_data);

        if (!$result) {
            $this->api->respond_error('Failed to create season.', 500);
            return;
        }

        $this->api->respond([
            'success' => true,
            'message' => 'Season created successfully.',
            'season_id' => $season_id,
            'data' => $season_data
        ], 201);
    }

    /**
     * PUT /api/seasons/{season_id}
     */
    public function update($season_id)
    {
        if (empty($season_id)) {
            $this->api->respond_error('Season ID is required.', 400);
            return;
        }

        $existing = $this->SeasonsModel->find($season_id);

        if (!$existing) {
            $this->api->respond_error('Season not found.', 404);
            return;
        }

        $data = $this->request->json();

        if (!is_array($data)) {
            $this->api->respond_error('Invalid JSON request.', 400);
            return;
        }

        $season_name = trim($data['season_name'] ?? '');
        $season_type = strtoupper(trim($data['season_type'] ?? ''));
        $start_date = trim($data['start_date'] ?? '');
        $end_date = trim($data['end_date'] ?? '');
        $description = trim($data['description'] ?? '');

        if (
            $season_name === '' ||
            $season_type === '' ||
            $start_date === '' ||
            $end_date === ''
        ) {
            $this->api->respond_error(
                'All required season fields must be provided.',
                422
            );
            return;
        }

        if (!in_array($season_type, ['WET', 'DRY'], true)) {
            $this->api->respond_error('Season type must be WET or DRY.', 422);
            return;
        }

        if (!$this->valid_date_range($start_date, $end_date)) {
            $this->api->respond_error(
                'Invalid dates. Use YYYY-MM-DD and ensure the end date is not earlier than the start date.',
                422
            );
            return;
        }

        $duplicate = $this->find_by_type_and_start($season_type, $start_date);

        if (
            $duplicate &&
            $this->row_value($duplicate, 'season_id') !== $season_id
        ) {
            $this->api->respond_error(
                'Another season already uses this type and start date.',
                409
            );
            return;
        }

        $update_data = [
            'season_name' => $season_name,
            'season_type' => $season_type,
            'start_date' => $start_date,
            'end_date' => $end_date,
            'status' => $this->calculate_status($start_date, $end_date),
            'description' => $description !== '' ? $description : null,
            'updated_at' => $this->manila_now()
        ];

        $result = $this->SeasonsModel->update($season_id, $update_data);

        if (!$result) {
            $this->api->respond_error('Failed to update season.', 500);
            return;
        }

        $this->api->respond([
            'success' => true,
            'message' => 'Season updated successfully.',
            'season_id' => $season_id,
            'data' => $update_data
        ], 200);
    }

    /**
     * DELETE /api/seasons/{season_id}
     */
    public function destroy($season_id)
    {
        if (empty($season_id)) {
            $this->api->respond_error('Season ID is required.', 400);
            return;
        }

        $season = $this->SeasonsModel->find($season_id);

        if (!$season) {
            $this->api->respond_error('Season not found.', 404);
            return;
        }

        $result = $this->SeasonsModel->delete($season_id);

        if (!$result) {
            $this->api->respond_error('Failed to delete season.', 500);
            return;
        }

        $this->api->respond([
            'success' => true,
            'message' => 'Season deleted successfully.',
            'season_id' => $season_id
        ], 200);
    }

    /**
     * Generate seasons for the current year and next two years.
     *
     * Wet: April 1 - September 30
     * Dry: October 1 - March 31 of the following year
     */
    private function synchronize_seasons()
    {
        $timezone = new DateTimeZone($this->timezone);
        $today = new DateTimeImmutable('today', $timezone);
        $current_year = (int) $today->format('Y');

        $generated = 0;
        $updated = 0;

        for ($year = $current_year; $year <= $current_year + 2; $year++) {
            // Wet season
            $wet_start = sprintf('%04d-04-01', $year);
            $wet_end = sprintf('%04d-09-30', $year);

            if ($this->ensure_season(
                'WET',
                "Wet Season {$year}",
                $wet_start,
                $wet_end
            )) {
                $generated++;
            }

            // Dry season
            $next_year = $year + 1;

            $dry_start = sprintf('%04d-10-01', $year);
            $dry_end = sprintf('%04d-03-31', $next_year);

            if ($this->ensure_season(
                'DRY',
                "Dry Season {$year}-{$next_year}",
                $dry_start,
                $dry_end
            )) {
                $generated++;
            }
        }

        // Update statuses of all existing seasons.
        $all_seasons = $this->SeasonsModel->all();
        $now = $this->manila_now();

        foreach ($all_seasons as $season) {
            $season_id = $this->row_value($season, 'season_id');
            $start_date = $this->row_value($season, 'start_date');
            $end_date = $this->row_value($season, 'end_date');
            $current_status = $this->row_value($season, 'status');

            if (!$season_id || !$start_date || !$end_date) {
                continue;
            }

            $correct_status = $this->calculate_status(
                $start_date,
                $end_date
            );

            if ($current_status !== $correct_status) {
                $this->SeasonsModel->update($season_id, [
                    'status' => $correct_status,
                    'updated_at' => $now
                ]);

                $updated++;
            }
        }

        return [
            'generated' => $generated,
            'updated' => $updated
        ];
    }

    /**
     * Create a season only if the same type and start date do not exist.
     */
    private function ensure_season(
        $type,
        $name,
        $start_date,
        $end_date
    ) {
        $existing = $this->find_by_type_and_start($type, $start_date);

        if ($existing) {
            return false;
        }

        $year = substr($start_date, 0, 4);
        $season_id = $this->generate_season_id($type, $year);
        $now = $this->manila_now();

        $season_data = [
            'season_id' => $season_id,
            'season_name' => $name,
            'season_type' => $type,
            'start_date' => $start_date,
            'end_date' => $end_date,
            'status' => $this->calculate_status($start_date, $end_date),
            'description' => 'Automatically generated rice cropping season.',
            'created_at' => $now,
            'updated_at' => $now
        ];

        $result = $this->SeasonsModel->insert($season_data);

        if (!$result) {
            throw new Exception(
                'Failed to generate ' . $name . '.'
            );
        }

        return true;
    }

    /**
     * Find season using season type and start date.
     */
    private function find_by_type_and_start($type, $start_date)
    {
        $seasons = $this->SeasonsModel->all();

        foreach ($seasons as $season) {
            $existing_type = strtoupper(
                (string) $this->row_value($season, 'season_type')
            );

            $existing_start = (string) $this->row_value(
                $season,
                'start_date'
            );

            if (
                $existing_type === $type &&
                $existing_start === $start_date
            ) {
                return $season;
            }
        }

        return null;
    }

    /**
     * Generate IDs such as WET-2027-001.
     */
    private function generate_season_id($type, $year)
    {
        $prefix = $type . '-' . $year . '-';
        $highest = 0;

        foreach ($this->SeasonsModel->all() as $season) {
            $id = (string) $this->row_value($season, 'season_id');

            if (
                preg_match(
                    '/^' . preg_quote($prefix, '/') . '(\d{3})$/',
                    $id,
                    $matches
                )
            ) {
                $number = (int) $matches[1];

                if ($number > $highest) {
                    $highest = $number;
                }
            }
        }

        return $prefix . str_pad(
            (string) ($highest + 1),
            3,
            '0',
            STR_PAD_LEFT
        );
    }

    /**
     * Determine status using Philippine local date.
     */
    private function calculate_status($start_date, $end_date)
    {
        $timezone = new DateTimeZone($this->timezone);
        $today = new DateTimeImmutable('today', $timezone);

        $start = new DateTimeImmutable($start_date, $timezone);
        $end = new DateTimeImmutable($end_date, $timezone);

        if ($today < $start) {
            return 'Upcoming';
        }

        if ($today > $end) {
            return 'Completed';
        }

        return 'Ongoing';
    }

    /**
     * Validate date format and date order.
     */
    private function valid_date_range($start_date, $end_date)
    {
        $start = DateTime::createFromFormat('!Y-m-d', $start_date);
        $end = DateTime::createFromFormat('!Y-m-d', $end_date);

        return (
            $start &&
            $end &&
            $start->format('Y-m-d') === $start_date &&
            $end->format('Y-m-d') === $end_date &&
            $end >= $start
        );
    }

    /**
     * Get a value from either an array or object model result.
     */
    private function row_value($row, $key)
    {
        if (is_array($row)) {
            return $row[$key] ?? null;
        }

        if (is_object($row)) {
            return $row->$key ?? null;
        }

        return null;
    }

    /**
     * Philippine local timestamp.
     */
    private function manila_now()
    {
        $timezone = new DateTimeZone($this->timezone);

        return (new DateTimeImmutable('now', $timezone))
            ->format('Y-m-d H:i:s');
    }
}
