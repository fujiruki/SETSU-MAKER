<?php
// ストレージモード設定
// 'sqlite'     : SQLite DB を使用（デフォルト・推奨）
// 'filesystem' : data/ フォルダに JSON + 画像で保存（ファイル管理で内容を確認したい場合）
define('STORAGE_MODE', 'sqlite');

define('DB_PATH',    __DIR__ . '/database.sqlite');
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('DATA_DIR',   __DIR__ . '/data/');
define('APP_ID',     'sm');
