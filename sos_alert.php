

<?php


header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); 

// Simple API key check (make sure ESP adds this in header)
$EXPECTED_API_KEY = "AIzaSyDLwuMaLAT3EHAekaEmdvcYNYy_HAV26pY";
$provided_key = $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($provided_key !== $EXPECTED_API_KEY) {
    http_response_code(401);
    echo json_encode(["status"=>"error","message"=>"unauthorized"]);
    exit;
}

// DB config
$dbHost = 'localhost';
$dbName = 'smartglo';
$dbUser = 'smartglo_user';
$dbPass = 'urs@123456789'; 

$body = file_get_contents("php://input");
$data = json_decode($body, true);

if (!isset($data['lat']) || !isset($data['lon'])) {
    http_response_code(400);
    echo json_encode(["status"=>"error","message"=>"missing lat/lon"]);
    exit;
}

$device = $data['device'] ?? 'SmartGlo';
$lat = floatval($data['lat']);
$lon = floatval($data['lon']);

try {
    $dsn = "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    $stmt = $pdo->prepare("INSERT INTO alerts (device, lat, lon) VALUES (:device, :lat, :lon)");
    $stmt->execute([
        ':device' => $device,
        ':lat' => $lat,
        ':lon' => $lon
    ]);

    $insertedId = $pdo->lastInsertId();

    // build payload to send to socket server
    $payload = [
        "id" => (int)$insertedId,
        "device" => $device,
        "lat" => $lat,
        "lon" => $lon,
        "time" => date('Y-m-d H:i:s')
    ];

    // Notify the Socket.IO server (simple HTTP POST)
    $socketServerUrl = "http://localhost:5000/broadcast"; 
    $ch = curl_init($socketServerUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-api-key: AIzaSyDLwuMaLAT3EHAekaEmdvcYNYy_HAV26pY'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 2);
    $resp = curl_exec($ch);
    $curlErr = curl_error($ch);
    curl_close($ch);

    echo json_encode(["status"=>"success","id"=>$insertedId, "socket_resp"=>$resp, "curl_err"=>$curlErr]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
}
