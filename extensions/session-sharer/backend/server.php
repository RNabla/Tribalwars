<?php error_reporting(0);
header('Access-Control-Allow-Origin: *');
if (isset($_SERVER['QUERY_STRING'])) {
    $queries = array();
    parse_str($_SERVER['QUERY_STRING'], $queries);
    if (
        !isset($queries['container']) ||
        !isset($queries['world']) ||
        !preg_match('/^[a-z0-9]{32}$/', $queries['container']) ||
        !preg_match('/^pl\d{3}$/', $queries['world'])
    ) {
        return http_response_code(400);
    }

    $filename = $queries['container'];
    $world = $queries['world'];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $payload = json_decode(file_get_contents('php://input'), true);
        if (!isset($payload) || !isset($payload['ciphertext']) || !isset($payload['iv'])) {
            return http_response_code(400);
        }
        $payload_data = array('ciphertext' => $payload['ciphertext'], 'iv' => $payload['iv']);
        if (!file_exists($filename)) {
            if (file_put_contents($filename, json_encode(array($world => $payload_data)))) {
                return;
            };
        } else {
            $container_data = json_decode(file_get_contents($filename), true);
            $container_data[$world] = $payload_data;
            if (file_put_contents($filename, json_encode($container_data))) {
                return;
            }
        }
    } else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (file_exists($filename)) {
            $container_data = json_decode(file_get_contents($filename), true);
            if (array_key_exists($world,  $container_data)) {
                echo json_encode($container_data[$world]);
                return;
            }
        }
        return http_response_code(404);
    }
}

http_response_code(400);
