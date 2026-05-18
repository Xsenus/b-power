<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$dataDir = __DIR__ . '/app-data';
$contentFile = $dataDir . '/content.json';
$leadsFile = $dataDir . '/leads.json';
$emailSettingsFile = $dataDir . '/email-settings.json';
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
        'source' => trim((string)($body['source'] ?? 'B-POWER landing')),
        'createdAt' => gmdate('c'),
    ];
}

function csv_escape($value): string
{
    $value = (string)($value ?? '');
    return '"' . str_replace('"', '""', $value) . '"';
}

function default_email_settings(): array
{
    return [
        'enabled' => false,
        'method' => 'mail',
        'toEmail' => '',
        'fromEmail' => '',
        'subject' => 'Новая заявка B-POWER',
        'smtpHost' => '',
        'smtpPort' => '465',
        'smtpSecure' => true,
        'smtpUser' => '',
        'smtpPass' => '',
    ];
}

function normalize_email_settings(array $body, array $current = []): array
{
    $base = array_merge(default_email_settings(), $current);
    return [
        'enabled' => (bool)($body['enabled'] ?? false),
        'method' => (($body['method'] ?? $base['method']) === 'smtp') ? 'smtp' : 'mail',
        'toEmail' => trim((string)($body['toEmail'] ?? '')),
        'fromEmail' => trim((string)($body['fromEmail'] ?? '')),
        'subject' => trim((string)($body['subject'] ?? $base['subject'])) ?: 'Новая заявка B-POWER',
        'smtpHost' => trim((string)($body['smtpHost'] ?? '')),
        'smtpPort' => trim((string)($body['smtpPort'] ?? $base['smtpPort'] ?? '465')),
        'smtpSecure' => (bool)($body['smtpSecure'] ?? false),
        'smtpUser' => trim((string)($body['smtpUser'] ?? '')),
        'smtpPass' => ($body['smtpPass'] ?? '') !== '' ? (string)$body['smtpPass'] : (string)($base['smtpPass'] ?? ''),
    ];
}

function public_email_settings(array $settings): array
{
    $settings['hasSmtpPass'] = ($settings['smtpPass'] ?? '') !== '';
    unset($settings['smtpPass']);
    return $settings;
}

function lead_email_text(array $lead): string
{
    return implode("\n", [
        'Имя: ' . ($lead['name'] ?? ''),
        'Телефон: ' . ($lead['phone'] ?? ''),
        'Email: ' . (($lead['email'] ?? '') ?: '-'),
        'Сообщение: ' . (($lead['message'] ?? '') ?: '-'),
        'Источник: ' . ($lead['source'] ?? ''),
        'Дата: ' . ($lead['createdAt'] ?? ''),
    ]);
}

function smtp_read($socket): string
{
    $data = '';
    while (($line = fgets($socket, 515)) !== false) {
        $data .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    return $data;
}

function smtp_command($socket, string $command, array $expected): void
{
    fwrite($socket, $command . "\r\n");
    $response = smtp_read($socket);
    $code = (int)substr($response, 0, 3);
    if (!in_array($code, $expected, true)) {
        throw new RuntimeException('SMTP error');
    }
}

function send_smtp_mail(array $settings, array $lead): void
{
    $host = $settings['smtpHost'] ?? '';
    $port = (int)($settings['smtpPort'] ?? 465);
    if ($host === '' || ($settings['toEmail'] ?? '') === '') {
        return;
    }

    $remote = !empty($settings['smtpSecure']) ? 'ssl://' . $host : $host;
    $socket = @stream_socket_client($remote . ':' . $port, $errno, $errstr, 12, STREAM_CLIENT_CONNECT);
    if (!$socket) {
        throw new RuntimeException('SMTP connection failed');
    }
    stream_set_timeout($socket, 12);
    smtp_read($socket);
    smtp_command($socket, 'EHLO buffalo-protein.ru', [250]);
    if (($settings['smtpUser'] ?? '') !== '') {
        smtp_command($socket, 'AUTH LOGIN', [334]);
        smtp_command($socket, base64_encode((string)$settings['smtpUser']), [334]);
        smtp_command($socket, base64_encode((string)($settings['smtpPass'] ?? '')), [235]);
    }

    $from = ($settings['fromEmail'] ?? '') ?: (($settings['smtpUser'] ?? '') ?: 'no-reply@buffalo-protein.ru');
    $to = (string)$settings['toEmail'];
    $subject = (string)(($settings['subject'] ?? '') ?: 'Новая заявка B-POWER');
    $body = lead_email_text($lead);
    $headers = [
        'From: ' . $from,
        'To: ' . $to,
        'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
    ];
    $message = implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n";

    smtp_command($socket, 'MAIL FROM:<' . $from . '>', [250]);
    smtp_command($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
    smtp_command($socket, 'DATA', [354]);
    smtp_command($socket, str_replace("\n.", "\n..", $message) . "\r\n.", [250]);
    smtp_command($socket, 'QUIT', [221]);
    fclose($socket);
}

function send_lead_email(array $lead, string $settingsFile): void
{
    $settings = normalize_email_settings(read_json_file($settingsFile, default_email_settings()), read_json_file($settingsFile, default_email_settings()));
    if (empty($settings['enabled']) || empty($settings['toEmail'])) {
        return;
    }

    if ($settings['method'] === 'smtp') {
        send_smtp_mail($settings, $lead);
        return;
    }

    $from = $settings['fromEmail'] ?: 'no-reply@buffalo-protein.ru';
    $headers = [
        'From: ' . $from,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
    ];
    @mail($settings['toEmail'], '=?UTF-8?B?' . base64_encode($settings['subject']) . '?=', lead_email_text($lead), implode("\r\n", $headers));
}

function upload_pdf_document(): array
{
    if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
        send_json(400, ['ok' => false, 'error' => 'PDF файл не передан']);
    }

    $file = $_FILES['file'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        send_json(400, ['ok' => false, 'error' => 'Не удалось загрузить PDF']);
    }

    if (($file['size'] ?? 0) > 15 * 1024 * 1024) {
        send_json(413, ['ok' => false, 'error' => 'PDF больше 15 МБ']);
    }

    $originalName = (string)($file['name'] ?? 'document.pdf');
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if ($extension !== 'pdf') {
        send_json(400, ['ok' => false, 'error' => 'Можно загружать только PDF']);
    }

    $tmpPath = (string)($file['tmp_name'] ?? '');
    $mime = is_file($tmpPath) && function_exists('mime_content_type') ? (string)mime_content_type($tmpPath) : '';
    if ($mime !== '' && !in_array($mime, ['application/pdf', 'application/x-pdf'], true)) {
        send_json(400, ['ok' => false, 'error' => 'Файл должен быть PDF']);
    }

    $uploadDir = __DIR__ . '/assets/docs';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $htaccess = "Options -Indexes\n<IfModule mod_headers.c>\nHeader set X-Robots-Tag \"noindex, nofollow, noarchive\"\n</IfModule>\n";
    file_put_contents($uploadDir . '/.htaccess', $htaccess);

    $fileName = 'document-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.pdf';
    $targetPath = $uploadDir . '/' . $fileName;
    if (!move_uploaded_file($tmpPath, $targetPath)) {
        send_json(500, ['ok' => false, 'error' => 'Не удалось сохранить PDF']);
    }

    return [
        'url' => '/assets/docs/' . $fileName,
        'name' => $fileName,
    ];
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

if ($path === '/api/settings/email' && $method === 'GET') {
    require_admin($jwtSecret);
    $settings = normalize_email_settings(read_json_file($emailSettingsFile, default_email_settings()), read_json_file($emailSettingsFile, default_email_settings()));
    send_json(200, ['ok' => true, 'data' => public_email_settings($settings)]);
}

if ($path === '/api/settings/email' && $method === 'PUT') {
    require_admin($jwtSecret);
    $current = read_json_file($emailSettingsFile, default_email_settings());
    $settings = normalize_email_settings(read_body(), $current);
    write_json_file($emailSettingsFile, $settings);
    send_json(200, ['ok' => true, 'data' => public_email_settings($settings)]);
}

if ($path === '/api/assets/upload' && $method === 'POST') {
    require_admin($jwtSecret);
    send_json(200, ['ok' => true, 'data' => upload_pdf_document()]);
}

if ($path === '/api/leads' && $method === 'POST') {
    $lead = normalize_lead(read_body());
    $leads = read_json_file($leadsFile, []);
    array_unshift($leads, $lead);
    write_json_file($leadsFile, $leads);
    try {
        send_lead_email($lead, $emailSettingsFile);
    } catch (Throwable $error) {
        error_log('Lead email failed: ' . $error->getMessage());
    }
    send_json(200, ['ok' => true, 'data' => $lead]);
}

if ($path === '/api/leads' && $method === 'GET') {
    require_admin($jwtSecret);
    send_json(200, ['ok' => true, 'data' => read_json_file($leadsFile, [])]);
}

if (preg_match('#^/api/leads/([^/]+)$#', $path, $matches) && $method === 'DELETE') {
    require_admin($jwtSecret);
    $id = rawurldecode($matches[1]);
    $leads = read_json_file($leadsFile, []);
    $nextLeads = array_values(array_filter($leads, static function ($lead) use ($id): bool {
        return (string)($lead['id'] ?? '') !== $id;
    }));
    if (count($nextLeads) === count($leads)) {
        send_json(404, ['ok' => false, 'error' => 'Заявка не найдена']);
    }
    write_json_file($leadsFile, $nextLeads);
    send_json(200, ['ok' => true, 'data' => ['id' => $id]]);
}

if ($path === '/api/leads/export' && $method === 'GET') {
    require_admin($jwtSecret);
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="b-power-leads.csv"');
    echo "\xEF\xBB\xBF";
    $rows = read_json_file($leadsFile, []);
    $keys = ['id', 'createdAt', 'name', 'phone', 'email', 'message', 'source'];
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
