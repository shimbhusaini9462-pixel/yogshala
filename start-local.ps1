$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$address = 'http://127.0.0.1:8085'
$listener = Get-NetTCPConnection -LocalPort 8085 -State Listen -ErrorAction SilentlyContinue
if (-not $listener) {
    Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList 'server.js' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'local-server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'local-server-error.log')
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $address -UseBasicParsing -TimeoutSec 1
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ready) { throw 'Website did not start. Check local-server-error.log.' }
}
Write-Host "Website: $address"
Start-Process $address
