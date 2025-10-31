<?php
session_start();
require "db.php";

$data = json_decode(file_get_contents("php://input"), true);
$username = $data["username"] ?? "";
$password = $data["password"] ?? "";

$stmt = $pdo->prepare("SELECT id, password_hash FROM users WHERE username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch();

if ($user && password_verify($password, $user["password_hash"])) {
    $_SESSION["user_id"] = $user["id"];
    $_SESSION["username"] = $username;  // <--- important
    echo json_encode(["success" => true, "username" => $username]);
} else {
    echo json_encode(["success" => false, "message" => "Invalid login"]);
}
