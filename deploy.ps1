$ErrorActionPreference = "Stop"

$serverHost = "www1045.conoha.ne.jp"
$serverUser = "c6924945"
$serverPort = "8022"
$remoteDir  = "public_html/door-fujita.com/contents/sm"
$sshKeyPath = "../Youkan/docs/01_RULES/UPLOAD/key-2025-11-29-07-10.pem"
$archiveName = "deploy.tar.gz"

Write-Host "SETSU-MAKER デプロイ開始..." -ForegroundColor Cyan
Write-Host "  Server : $serverHost"
Write-Host "  Target : $remoteDir"

# 1. フロントエンドビルド
Write-Host "`n[1/4] フロントエンドビルド..." -ForegroundColor Yellow
Push-Location "frontend"
try {
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }
} finally {
    Pop-Location
}

# 2. デプロイパッケージ作成
Write-Host "`n[2/4] パッケージ作成..." -ForegroundColor Yellow
$deployTmp = "deploy_tmp"
if (Test-Path $deployTmp) { Remove-Item $deployTmp -Recurse -Force }
New-Item -ItemType Directory -Path $deployTmp | Out-Null

# API ファイルをコピーしてからデータ系を除外（サーバー上のデータを守る）
New-Item -ItemType Directory -Path "$deployTmp\api" | Out-Null
Copy-Item -Path "api\*" -Destination "$deployTmp\api" -Recurse -Force
foreach ($exclude in @("database.sqlite", "uploads", "data")) {
    $p = "$deployTmp\api\$exclude"
    if (Test-Path $p) { Remove-Item $p -Recurse -Force }
}

# フロントエンドビルド成果物
Get-ChildItem "frontend\dist" | Copy-Item -Destination $deployTmp -Recurse -Force

# ルート .htaccess
Copy-Item ".htaccess" -Destination $deployTmp -Force

# 3. アーカイブ作成
Write-Host "`n[3/4] アーカイブ作成..." -ForegroundColor Yellow
tar -czf $archiveName -C $deployTmp .
if ($LASTEXITCODE -ne 0) { throw "tar failed" }
$size = [math]::Round((Get-Item $archiveName).Length / 1KB, 1)
Write-Host "  ✓ ${size} KB" -ForegroundColor Green
Remove-Item $deployTmp -Recurse -Force

# 4. アップロード & 展開
Write-Host "`n[4/4] サーバーへ転送..." -ForegroundColor Yellow
$sshOpts = @("-o", "StrictHostKeyChecking=no", "-p", $serverPort, "-i", $sshKeyPath)
$scpOpts = @("-o", "StrictHostKeyChecking=no", "-P", $serverPort, "-i", $sshKeyPath)

try {
    & ssh @sshOpts "$serverUser@$serverHost" "mkdir -p $remoteDir/api/uploads $remoteDir/api/data"
    & scp @scpOpts $archiveName "${serverUser}@${serverHost}:${remoteDir}/${archiveName}"
    & ssh @sshOpts "$serverUser@$serverHost" `
        "cd $remoteDir && tar -xzf $archiveName && rm $archiveName && chmod -R 755 . && chmod -R 777 api/uploads api/data"

    Write-Host "`n✅ デプロイ完了!" -ForegroundColor Green
    Write-Host "  URL: https://door-fujita.com/contents/sm/" -ForegroundColor Cyan
} finally {
    if (Test-Path $archiveName) { Remove-Item $archiveName }
}
