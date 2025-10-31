<?php
session_start();

// https://dbadmin.r103.websupport.se/

$dsn = "mysql:host=mariadb114.r103.websupport.se;dbname=guitarprogress;charset=utf8mb4";
$dbUser = "D9Z3NaFQ";
$dbPass = "w-,+?SZnPbl3GumP0rp(";

try {
    $pdo = new PDO($dsn, $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed"]);
    exit;
}

header("Content-Type: application/json");
