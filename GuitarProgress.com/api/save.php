<?php
require "db.php";
session_start();

if (!isset($_SESSION["user_id"])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$key = $data["key"] ?? "";
$value = isset($data["value"]) ? json_encode($data["value"]) : "";

if (!$key) {
    echo json_encode(["success" => false, "message" => "Missing key"]);
    exit;
}

$stmt = $pdo->prepare("
  INSERT INTO user_data (user_id, key_name, value)
  VALUES (?, ?, ?)
  ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP
");
$stmt->execute([$_SESSION["user_id"], $key, $value]);

echo json_encode(["success" => true]);
