param (
	[switch]$KeepLocalDB
)

$ErrorActionPreference = "Stop"

$serverHost = "www1045.conoha.ne.jp"
$serverUser = "c6924945"
$serverPort = "8022"
$remoteDir = "public_html/door-fujita.com/contents/sm"
$sshKeyPath = "C:\Fujiruki\Secret\key-2026-03-21-18-16-ConohaforAI.pem"
$archiveName = "deploy.tar.gz"

Write-Host "Starting SETSU-MAKER deployment..."
Write-Host "Server: $serverHost"
Write-Host "Target: $remoteDir"

Write-Host "`n[1/4] Building project..."
Set-Location "$PSScriptRoot\frontend"
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }
Set-Location $PSScriptRoot

Write-Host "`n[2/4] Staging files..."
$stagingDir = "deploy_staging"
if (Test-Path $stagingDir) { Remove-Item $stagingDir -Recurse -Force }
New-Item -ItemType Directory -Path $stagingDir | Out-Null

Write-Host "  → Copying dist..." -ForegroundColor Cyan
Copy-Item "frontend\dist\*" "$stagingDir\" -Recurse -Force

Write-Host "  → Copying api..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path "$stagingDir\api" | Out-Null
Copy-Item "api\*" "$stagingDir\api\" -Recurse -Force

if (!$KeepLocalDB) {
	Write-Host "  → Excluding local SQLite DB..." -ForegroundColor Yellow
	Remove-Item "$stagingDir\api\*.sqlite" -ErrorAction SilentlyContinue
	Remove-Item "$stagingDir\api\*.db" -ErrorAction SilentlyContinue
} else {
	Write-Host "  → WARNING: Uploading local SQLite DB (OVERWRITES production data!)" -ForegroundColor Red
}

Write-Host "`n[3/4] Creating archive..."
tar -czf $archiveName -C $stagingDir .
if ($LASTEXITCODE -ne 0) { throw "tar failed" }

Write-Host "`n[4/4] Uploading and extracting..."
$sshMkdir = "mkdir -p $remoteDir"
$sshExtract = "cd $remoteDir && find . -maxdepth 1 ! -name 'api' ! -name 'uploads' ! -name '.' ! -name '$archiveName' ! -name '*.sqlite' ! -name '.user.ini' -exec rm -rf {} + && tar -xf $archiveName && rm $archiveName"
$sshPerms = "find $remoteDir -type d -exec chmod 755 {} + && find $remoteDir -type f -exec chmod 644 {} + && find $remoteDir/api -name '*.sqlite' -exec chmod 666 {} + && chmod 777 $remoteDir/api/uploads 2>/dev/null || true"

$scpArgs = @(
	"-o", "StrictHostKeyChecking=no",
	"-P", $serverPort,
	"-i", $sshKeyPath,
	$archiveName,
	"$serverUser@$serverHost`:$remoteDir/$archiveName"
)

try {
	Write-Host "  → Ensuring remote directory..." -ForegroundColor Cyan
	& ssh -o StrictHostKeyChecking=no -p $serverPort -i $sshKeyPath "$serverUser@$serverHost" $sshMkdir
	if ($LASTEXITCODE -ne 0) { throw "SSH mkdir failed" }

	Write-Host "  → Uploading..." -ForegroundColor Cyan
	& scp $scpArgs
	if ($LASTEXITCODE -ne 0) { throw "SCP failed" }

	Write-Host "  → Extracting on server..." -ForegroundColor Cyan
	& ssh -o StrictHostKeyChecking=no -p $serverPort -i $sshKeyPath "$serverUser@$serverHost" $sshExtract
	if ($LASTEXITCODE -ne 0) { throw "SSH extract failed" }

	Write-Host "  → Fixing permissions..." -ForegroundColor Cyan
	& ssh -o StrictHostKeyChecking=no -p $serverPort -i $sshKeyPath "$serverUser@$serverHost" $sshPerms

	Write-Host "`n========================================" -ForegroundColor Green
	Write-Host "  DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
	Write-Host "  https://door-fujita.com/contents/sm/" -ForegroundColor Green
	Write-Host "========================================" -ForegroundColor Green
} finally {
	if (Test-Path $archiveName) { Remove-Item $archiveName }
	if (Test-Path $stagingDir) { Remove-Item $stagingDir -Recurse -Force }
}
