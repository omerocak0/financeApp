# ==============================================================
#  financeApp - Akilli Baslat Scripti
#  Kullanim: Proje klasorunde sag tik > "PowerShell ile Calistir"
#  VEYA: .\baslat.ps1
# ==============================================================

$PORT = 8000
$API_TS_PATH = ".\src\sabitler\api.ts"
$BACKEND_PATH = ".\backend"

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  financeApp - Akilli Baslat" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Port temizleme ---
Write-Host "[1/4] Port $PORT kontrol ediliyor..." -ForegroundColor Yellow
$conn = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    $pid = $conn.OwningProcess
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
    Write-Host "      Port $PORT temizlendi (PID: $pid)" -ForegroundColor Green
} else {
    Write-Host "      Port $PORT bos, devam ediliyor." -ForegroundColor Green
}

# --- 2. Mevcut IP adresini bul ---
Write-Host "[2/4] WiFi IP adresi aliniyor..." -ForegroundColor Yellow

# Gercek WiFi/Ethernet IP'sini bul (sanal adaptörleri hariç tut)
$excludeKeywords = @("Virtual", "Loopback", "VirtualBox", "VMware", "Hyper-V", "vEthernet", "Bluetooth")
$ip = $null

$adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.*" -and
    $_.PrefixOrigin -eq "Dhcp"
}

foreach ($adapter in $adapters) {
    $alias = $adapter.InterfaceAlias
    $isVirtual = $false
    foreach ($kw in $excludeKeywords) {
        if ($alias -like "*$kw*") { $isVirtual = $true; break }
    }
    if (-not $isVirtual) {
        $ip = $adapter.IPAddress
        break
    }
}

# Fallback: DHCP olmayan ama gercek gorunen IP
if (-not $ip) {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 |
           Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" -and $_.IPAddress -notlike "192.168.56.*" } |
           Select-Object -First 1).IPAddress
}

if (-not $ip) {
    $ip = "127.0.0.1"
    Write-Host "      Uyari: IP alinamadi, localhost kullaniliyor." -ForegroundColor Red
} else {
    Write-Host "      IP bulundu: $ip" -ForegroundColor Green
}

# --- 3. api.ts dosyasini guncelle ---
Write-Host "[3/4] api.ts guncelleniyor..." -ForegroundColor Yellow
$newContent = @"
/**
 * Backend sunucu adresi - OTOMATIK GUNCELLENDI
 * Guncellenme zamani: $(Get-Date -Format 'yyyy-MM-dd HH:mm')
 * Telefon ve bilgisayar AYNI Wi-Fi aginda olmalidir.
 */
export const API_URL = 'http://${ip}:${PORT}';
"@
Set-Content -Path $API_TS_PATH -Value $newContent -Encoding UTF8
Write-Host "      api.ts guncellendi -> http://${ip}:${PORT}" -ForegroundColor Green

# --- 4. Backend'i baslat ---
Write-Host "[4/4] Backend baslatiliyor..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  BACKEND CALISIYOR!" -ForegroundColor Green
Write-Host "  Expo/Telefon: http://${ip}:${PORT}" -ForegroundColor White
Write-Host "  Yerel test  : http://localhost:${PORT}" -ForegroundColor White
Write-Host "  Durdurmak   : CTRL+C" -ForegroundColor Gray
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $BACKEND_PATH
python main.py
