
<?php
// CRITICAL: Start Output Buffering immediately
ob_start();

error_reporting(0); 
ini_set('display_errors', 0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    http_response_code(200);
    exit;
}

session_start();
$dbFile = 'database.json';

// Ensure DB exists with complete structure
if (!file_exists($dbFile)) {
    file_put_contents($dbFile, json_encode([
        'transactions' => [], 
        'history' => [], 
        'losses' => [],
        'products' => [], 
        'settings' => [],
        'content' => []
    ], JSON_PRETTY_PRINT));
}

function sendResponse($data) {
    if (ob_get_length()) ob_clean(); 
    echo json_encode($data);
    exit;
}

function getDB() {
    global $dbFile;
    $fp = fopen($dbFile, 'r');
    $data = null;
    if ($fp && flock($fp, LOCK_SH)) {
        $size = filesize($dbFile);
        if ($size > 0) {
            $content = fread($fp, $size);
            $data = json_decode($content, true);
        }
        flock($fp, LOCK_UN);
    }
    if ($fp) fclose($fp);

    $defaults = [
        'transactions' => [], 
        'history' => [], 
        'losses' => [],
        'products' => [],
        'settings' => [],
        'content' => []
    ];

    if (!is_array($data)) return $defaults;
    return array_merge($defaults, $data);
}

function saveDB($data) {
    global $dbFile;
    if (file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX)) {
        return true;
    }
    return false;
}

function getJsonInput() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// --- AUTH ---
if ($action === 'check_session') {
    if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
        sendResponse(['status' => 'logged_in']);
    } else {
        sendResponse(['status' => 'not_logged_in']);
    }
}

if ($action === 'login' && $method === 'POST') {
    $input = getJsonInput();
    $user = trim($input['user'] ?? '');
    $pass = trim($input['pass'] ?? '');

    if ($user === 'arya1212' && $pass === 'ab87bCBG$@y5542hhKLnb') {
        session_regenerate_id(true); 
        $_SESSION['admin_logged_in'] = true;
        session_write_close(); 
        sendResponse(['status' => 'success']);
    } else {
        sendResponse(['status' => 'error', 'msg' => 'Username/Password salah!']);
    }
}

if ($action === 'logout') {
    session_destroy();
    sendResponse(['status' => 'success']);
}

// --- DATA ---
if ($action === 'get_data') {
    sendResponse(getDB());
}

if ($action === 'save_products' && $method === 'POST') {
    $input = getJsonInput();
    $db = getDB();
    $db['products'] = $input;
    saveDB($db);
    sendResponse(['status' => 'success']);
}

if ($action === 'save_settings' && $method === 'POST') {
    $input = getJsonInput();
    $db = getDB();
    $db['settings'] = $input;
    saveDB($db);
    sendResponse(['status' => 'success']);
}

if ($action === 'save_content' && $method === 'POST') {
    $input = getJsonInput();
    $db = getDB();
    $db['content'] = $input;
    saveDB($db);
    sendResponse(['status' => 'success']);
}

if ($action === 'add_transaction' && $method === 'POST') {
    $input = getJsonInput();
    $db = getDB();
    array_unshift($db['transactions'], $input);
    saveDB($db);
    sendResponse(['status' => 'success']);
}

if ($action === 'update_status' && $method === 'POST') {
    $input = getJsonInput();
    $id = $input['id'] ?? null;
    $status = $input['status'] ?? null;
    
    if (!$id || !$status) sendResponse(['status' => 'error', 'msg' => 'ID missing']);

    $db = getDB();
    $foundInActive = false;
    $itemToMove = null;
    $newTransactions = [];

    foreach ($db['transactions'] as $t) {
        if ($t['id'] === $id) {
            $t['status'] = $status;
            $itemToMove = $t;
            $foundInActive = true;
        } else {
            $newTransactions[] = $t;
        }
    }

    if ($foundInActive && $itemToMove) {
        $db['transactions'] = $newTransactions;
        array_unshift($db['history'], $itemToMove);
        saveDB($db);
        sendResponse(['status' => 'success', 'msg' => 'Moved to history']);
    } else {
        $updatedHistory = false;
        foreach ($db['history'] as &$ht) {
            if ($ht['id'] === $id) {
                $ht['status'] = $status;
                $updatedHistory = true;
                break;
            }
        }
        if ($updatedHistory) {
            saveDB($db);
            sendResponse(['status' => 'success', 'msg' => 'Updated in history']);
        } else {
            sendResponse(['status' => 'error', 'msg' => 'ID not found']);
        }
    }
}

if ($action === 'upload_proof' && $method === 'POST') {
    $input = getJsonInput();
    $id = $input['id'] ?? '';
    $proofUrl = $input['proofUrl'] ?? '';
    
    $db = getDB();
    $updated = false;
    foreach ($db['transactions'] as &$t) {
        if ($t['id'] === $id) {
            $t['proofUrl'] = $proofUrl;
            $updated = true;
            break;
        }
    }
    if ($updated) { saveDB($db); sendResponse(['status' => 'success']); }
    else sendResponse(['status' => 'error']);
}

if ($action === 'add_loss' && $method === 'POST') {
    $input = getJsonInput();
    $db = getDB();
    array_unshift($db['losses'], $input);
    saveDB($db);
    sendResponse(['status' => 'success']);
}

if ($action === 'reset_data' && $method === 'POST') {
    if (saveDB(['transactions' => [], 'history' => [], 'losses' => [], 'products' => [], 'settings' => [], 'content' => []])) {
        sendResponse(['status' => 'success']);
    }
    sendResponse(['status' => 'error']);
}

sendResponse(['status' => 'error', 'msg' => 'Invalid Action']);
?>
