<?php
declare(strict_types=1);

// Requires PHP and a working local sendmail/Postfix service on the VPS.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function reply(int $status, bool $success, string $message): never {
    http_response_code($status);
    echo json_encode(['success' => $success, 'message' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    reply(405, false, 'Please submit the enquiry form.');
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 16384) {
    reply(413, false, 'Your enquiry is too long.');
}

// User input never controls the recipient, sender, subject or mail headers.
foreach (['name', 'phone', 'service', 'area', 'message', 'website'] as $field) {
    if (isset($_POST[$field]) && !is_string($_POST[$field])) {
        reply(400, false, 'Please enter valid enquiry details.');
    }
}
if (trim($_POST['website'] ?? '') !== '') {
    reply(400, false, 'Unable to accept this enquiry.');
}
$name = trim($_POST['name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$service = trim($_POST['service'] ?? '');
$area = trim($_POST['area'] ?? '');
$message = trim($_POST['message'] ?? '');
$services = ['Cable TV', 'Internet (FTTH)', 'Internet', 'Solar Solutions', 'Solar',
             'CCTV & Security', 'CCTV', 'Website Development', 'Existing service support'];
if ($name === '' || strlen($name) > 400 || preg_match('/[\r\n\x00]/', $name)
    || !preg_match('/^[0-9 +()\-]{10,18}$/D', $phone)
    || !in_array($service, $services, true)
    || strlen($area) > 600 || strlen($message) > 4000) {
    reply(400, false, 'Please enter your name, valid mobile number and service.');
}

// Throttle repeated submissions in the same browser session.
session_start(['cookie_httponly' => true, 'cookie_samesite' => 'Lax']);
if (time() - (int) ($_SESSION['last_enquiry_sent'] ?? 0) < 60) {
    reply(429, false, 'Please wait a minute before sending another enquiry.');
}

$recipient = 'tcvadmin@timecablevision.in';
$body = "New Time Cable Vision website enquiry\n\n"
      . "Name: {$name}\nMobile: {$phone}\nService: {$service}\n"
      . 'Area: ' . ($area !== '' ? $area : 'Not provided') . "\n\n"
      . 'Message: ' . ($message !== '' ? $message : 'Please contact me about this service.') . "\n";
$headers = [
    'From' => 'Time Cable Vision Website <tcvadmin@timecablevision.in>',
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => '8bit',
];
$accepted = function_exists('mail')
    && @mail($recipient, 'New website enquiry - Time Cable Vision', $body, $headers);
if (!$accepted) {
    error_log('TCV website enquiry: mail transport did not accept the message.');
    reply(503, false, 'Unable to send your enquiry. Please email tcvadmin@timecablevision.in or call 99625 43540.');
}
$_SESSION['last_enquiry_sent'] = time();
reply(200, true, 'Your enquiry has been submitted. Our team will contact you.');
