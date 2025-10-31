<?php
require "db.php";

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$key = $data["key"] ?? "";

$stmt = $pdo->prepare("SELECT value FROM user_data WHERE user_id = ? AND key_name = ?");
$stmt->execute([$_SESSION["user_id"], $key]);
$row = $stmt->fetch();

if ($row) {
    echo json_encode([
        "success" => true,
        "value" => json_decode($row["value"], true) // decode before sending
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "No data found"
    ]);
}
