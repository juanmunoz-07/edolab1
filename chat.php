
<?php
/* EDO LAB - Conexión con Google Gemini API (PHP/XAMPP)
   La API Key permanece exclusivamente en el servidor.
*/

$API_KEY = getenv('GROQ_API_KEY') ?: '';
if ($API_KEY === '' && is_file(__DIR__ . '/config.local.php')) {
    $cfg = include __DIR__ . '/config.local.php';
    $API_KEY = is_array($cfg) ? ($cfg['GROQ_API_KEY'] ?? '') : '';
}
$MODEL = 'openai/gpt-oss-120b';
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

// RESPUESTAS JSON
function out($code, $arr) {
    http_response_code($code);
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    exit;
}

// RECORTAR TEXTO
function cut($s, $n) {
    return function_exists('mb_substr')
        ? mb_substr($s, 0, $n)
        : substr($s, 0, $n);
}

// COMPROBAR MÉTODO
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    out(405, ['error' => 'Usa POST']);
}

// COMPROBAR API KEY
if ($API_KEY === '' || strpos($API_KEY, 'PEGA_AQUI') === 0) {
    out(500, ['error' => 'Falta configurar la API Key de Groq (crea config.local.php)']);
}

// LÍMITE DE 20 MENSAJES POR MINUTO
$f = sys_get_temp_dir() . '/edolab_' . md5($_SERVER['REMOTE_ADDR'] ?? 'x');
$now = time();

$hits = array_filter(
    array_map('intval', @file($f, FILE_IGNORE_NEW_LINES) ?: []),
    function ($t) use ($now) {
        return $now - $t < 60;
    }
);

if (count($hits) >= 20) {
    out(429, ['error' => 'Demasiadas preguntas. Espera un minuto.']);
}

$hits[] = $now;
@file_put_contents($f, implode("\n", $hits));

// LEER MENSAJES
$raw = file_get_contents('php://input');

if (strlen($raw) > 60000) {
    out(413, ['error' => 'Mensaje demasiado largo.']);
}

$in = json_decode($raw, true);

$list = (is_array($in) && isset($in['messages']) && is_array($in['messages']))
    ? $in['messages']
    : [];

$messages = [];

foreach (array_slice($list, -10) as $m) {

    if (!is_array($m)) continue;

    $content = cut((string)($m['content'] ?? ''), 6000);

    if (trim($content) === '') continue;

    $role = (($m['role'] ?? '') === 'assistant')
        ? 'assistant'
        : 'user';

    $messages[] = [
        'role' => $role,
        'content' => $content
    ];
}

// EL PRIMER MENSAJE DEBE SER DEL USUARIO
while ($messages && $messages[0]['role'] !== 'user') {
    array_shift($messages);
}

if (!$messages) {
    out(400, ['error' => 'Mensaje vacío.']);
}

// LEER PROMPT
$promptFile = __DIR__ . '/prompt.txt';

if (!file_exists($promptFile)) {
    out(500, ['error' => 'No se encontró el archivo prompt.txt']);
}

$systemPrompt = trim(file_get_contents($promptFile));

if ($systemPrompt === '') {
    out(500, ['error' => 'El archivo prompt.txt está vacío.']);
}

// AGREGAR INSTRUCCIONES DEL SISTEMA
array_unshift($messages, [
    'role' => 'system',
    'content' => $systemPrompt
]);

// CONECTAR CON GROQ
$url = 'https://api.groq.com/openai/v1/chat/completions';

$payload = [
    'model' => $MODEL,
    'messages' => $messages,
    'max_completion_tokens' => 3000
];

// INICIAR CURL
$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 90,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $API_KEY
    ],
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE)
]);

// REINTENTOS AUTOMÁTICOS
$res = false;
$code = 0;
$error = '';

for ($i = 1; $i <= 3; $i++) {

    $res = curl_exec($ch);

    if ($res === false) {
        $error = curl_error($ch);
        $code = 0;
    } else {
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    }

    if ($res !== false && $code < 400) {
        break;
    }

    $retryCodes = [429, 500, 502, 503, 504];

    if ($i < 3 && ($res === false || in_array($code, $retryCodes))) {
        sleep(2 ** $i);
        continue;
    }

    break;
}

curl_close($ch);

// ERROR DE CONEXIÓN
if ($res === false) {
    out(502, [
        'error' => 'No se pudo conectar con Groq: ' . $error
    ]);
}

// LEER RESPUESTA
$data = json_decode($res, true);

// COMPROBAR ERRORES
if ($code >= 400) {
    out($code, [
        'error' => $data['error']['message'] ?? 'Error de la API de Groq'
    ]);
}

// EXTRAER RESPUESTA
$text = $data['choices'][0]['message']['content'] ?? '';

if (is_array($text)) {
    $text = json_encode($text, JSON_UNESCAPED_UNICODE);
}

if (!is_string($text) || trim($text) === '') {
    out(502, [
        'error' => 'Groq no devolvió una respuesta de texto.'
    ]);
}

// RESPUESTA FINAL
out(200, ['text' => $text]);