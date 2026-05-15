<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$dataDir = __DIR__ . '/app-data';
$contentFile = $dataDir . '/content.json';
$leadsFile = $dataDir . '/leads.json';
$configFile = $dataDir . '/config.php';

$config = is_file($configFile) ? require $configFile : [];
$adminPasswordHash = $config['admin_password_hash'] ?? '';
$adminPassword = $config['admin_password'] ?? '';
$jwtSecret = $config['jwt_secret'] ?? '';

function send_json(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function read_json_file(string $path, array $fallback): array
{
    if (!is_file($path)) {
        return $fallback;
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw ?: '', true);
    return is_array($data) ? $data : $fallback;
}

function write_json_file(string $path, array $data): void
{
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    $tmp = $path . '.tmp';
    file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL, LOCK_EX);
    rename($tmp, $path);
}

function base64url_encode_string(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function base64url_decode_string(string $value): string
{
    $pad = strlen($value) % 4;
    if ($pad) {
        $value .= str_repeat('=', 4 - $pad);
    }
    return base64_decode(strtr($value, '-_', '+/')) ?: '';
}

function issue_token(string $secret): array
{
    $expiresAt = time() + 86400;
    $payload = json_encode(['role' => 'admin', 'exp' => $expiresAt], JSON_UNESCAPED_SLASHES);
    $payloadPart = base64url_encode_string($payload ?: '{}');
    $signature = base64url_encode_string(hash_hmac('sha256', $payloadPart, $secret, true));
    return [
        'token' => $payloadPart . '.' . $signature,
        'expiresAt' => gmdate('c', $expiresAt),
    ];
}

function require_admin(string $secret): void
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        send_json(401, ['ok' => false, 'error' => 'Требуется вход в админку']);
    }

    [$payloadPart, $signature] = array_pad(explode('.', $matches[1], 2), 2, '');
    $expected = base64url_encode_string(hash_hmac('sha256', $payloadPart, $secret, true));
    if (!$payloadPart || !$signature || !hash_equals($expected, $signature)) {
        send_json(401, ['ok' => false, 'error' => 'Неверный токен']);
    }

    $payload = json_decode(base64url_decode_string($payloadPart), true);
    if (!is_array($payload) || (int)($payload['exp'] ?? 0) < time()) {
        send_json(401, ['ok' => false, 'error' => 'Сессия истекла. Войдите снова']);
    }
}

function normalize_lead(array $body): array
{
    $name = trim((string)($body['name'] ?? ''));
    $phone = trim((string)($body['phone'] ?? ''));
    $email = trim((string)($body['email'] ?? ''));
    $message = trim((string)($body['message'] ?? ''));
    $phoneDigits = preg_replace('/\D+/', '', $phone) ?: '';

    $nameLength = function_exists('mb_strlen') ? mb_strlen($name) : strlen($name);
    if ($nameLength < 2) {
        send_json(400, ['ok' => false, 'error' => 'Введите имя']);
    }

    if (strlen($phoneDigits) < 10 || strlen($phoneDigits) > 11) {
        send_json(400, ['ok' => false, 'error' => 'Введите корректный телефон']);
    }

    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        send_json(400, ['ok' => false, 'error' => 'Введите корректный email']);
    }

    return [
        'id' => bin2hex(random_bytes(8)),
        'name' => $name,
        'phone' => $phone,
        'email' => $email,
        'message' => $message,
        'source' => trim((string)($body['source'] ?? 'landing')),
        'createdAt' => gmdate('c'),
    ];
}

function csv_escape($value): string
{
    $value = (string)($value ?? '');
    return '"' . str_replace('"', '""', $value) . '"';
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    send_json(200, ['ok' => true]);
}

if ($jwtSecret === '' && ($adminPasswordHash !== '' || $adminPassword !== '')) {
    send_json(500, ['ok' => false, 'error' => 'API secret не настроен']);
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($path === '/api/health' && $method === 'GET') {
    send_json(200, ['ok' => true, 'data' => ['status' => 'ok']]);
}

if ($path === '/api/auth/login' && $method === 'POST') {
    $body = read_body();
    $password = (string)($body['password'] ?? '');
    $validPassword = $adminPasswordHash !== ''
        ? password_verify($password, $adminPasswordHash)
        : ($adminPassword !== '' && hash_equals($adminPassword, $password));
    if (!$validPassword) {
        send_json(401, ['ok' => false, 'error' => 'Неверный пароль']);
    }
    send_json(200, ['ok' => true, 'data' => issue_token($jwtSecret)]);
}

if ($path === '/api/content' && $method === 'GET') {
    send_json(200, ['ok' => true, 'data' => read_json_file($contentFile, [])]);
}

if ($path === '/api/content' && $method === 'PUT') {
    require_admin($jwtSecret);
    $body = read_body();
    if (!$body || !isset($body['seo'], $body['hero'], $body['product']) || !is_array($body['product']['items'] ?? null)) {
        send_json(400, ['ok' => false, 'error' => 'Некорректный content.json']);
    }
    write_json_file($contentFile, $body);
    send_json(200, ['ok' => true, 'data' => $body]);
}

if ($path === '/api/leads' && $method === 'POST') {
    $lead = normalize_lead(read_body());
    $leads = read_json_file($leadsFile, []);
    array_unshift($leads, $lead);
    write_json_file($leadsFile, $leads);
    send_json(200, ['ok' => true, 'data' => $lead]);
}

if ($path === '/api/leads' && $method === 'GET') {
    require_admin($jwtSecret);
    send_json(200, ['ok' => true, 'data' => read_json_file($leadsFile, [])]);
}

if ($path === '/api/leads/export' && $method === 'GET') {
    require_admin($jwtSecret);
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="b-power-leads.csv"');
    echo "\xEF\xBB\xBF";
    $rows = read_json_file($leadsFile, []);
    $keys = ['id', 'name', 'phone', 'email', 'message', 'source', 'createdAt'];
    echo implode(';', $keys) . PHP_EOL;
    foreach ($rows as $row) {
        $values = [];
        foreach ($keys as $key) {
            $values[] = csv_escape($row[$key] ?? '');
        }
        echo implode(';', $values) . PHP_EOL;
    }
    exit;
}

if ($path === '/api/send-lead' && $method === 'POST') {
    send_json(501, ['ok' => false, 'error' => 'SMTP не настроен на этом хостинге']);
}

send_json(404, ['ok' => false, 'error' => 'Метод API не найден']);
