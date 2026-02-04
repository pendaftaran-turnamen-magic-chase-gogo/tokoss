
<?php
error_reporting(0);
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('Access-Control-Allow-Origin: *');

set_time_limit(0);

$dbFile = 'database.json';
$lastMtime = 0;

function safeRead($file) {
    $fp = fopen($file, 'r');
    if (!$fp) return false;
    
    $content = false;
    if (flock($fp, LOCK_SH)) { // Shared lock
        $size = filesize($file);
        if ($size > 0) {
            $content = fread($fp, $size);
        }
        flock($fp, LOCK_UN);
    }
    fclose($fp);
    return $content;
}

function sendMsg($jsonString) {
    if (!$jsonString) return;
    
    // SSE requires single-line data. 
    // We decode and re-encode to strip newlines from Pretty Print
    $data = json_decode($jsonString);
    if ($data) {
        $compactJson = json_encode($data);
        echo "data: " . $compactJson . "\n\n";
        ob_flush();
        flush();
    }
}

// Initial Send
if (file_exists($dbFile)) {
    $lastMtime = filemtime($dbFile);
    $content = safeRead($dbFile);
    if ($content) sendMsg($content);
}

// Loop
while (true) {
    clearstatcache();
    
    if (file_exists($dbFile)) {
        $currentMtime = filemtime($dbFile);
        
        if ($currentMtime > $lastMtime) {
            $content = safeRead($dbFile);
            if ($content) {
                sendMsg($content);
                $lastMtime = $currentMtime;
            }
        }
    }

    echo ": heartbeat\n\n";
    ob_flush();
    flush();

    if (connection_aborted()) break;
    sleep(1);
}
?>
