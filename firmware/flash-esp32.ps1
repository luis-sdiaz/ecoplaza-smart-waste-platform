[CmdletBinding()]
param(
    [string]$Port = "COM3"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  EcoPlaza IoT - Automatización de Flasheo ESP32 (PlatformIO)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "[INFO] Puerto objetivo: $Port" -ForegroundColor Gray

# 1. Verificar si PlatformIO CLI (pio) está disponible en el PATH
$pioCmd = Get-Command "pio" -ErrorAction SilentlyContinue
if (-not $pioCmd) {
    Write-Host "`n[ERROR] PlatformIO CLI ('pio') no se encuentra disponible en el PATH de este sistema." -ForegroundColor Red
    Write-Host "[AYUDA] Para instalar PlatformIO Core ejecuta en tu terminal:" -ForegroundColor Yellow
    Write-Host "        pip install platformio" -ForegroundColor White
    Write-Host "[AYUDA] O instala la extension oficial 'PlatformIO IDE' en Visual Studio Code." -ForegroundColor Yellow
    exit 1
}

# 2. Verificar existencia del archivo local de configuración con credenciales
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$configSrcPath = Join-Path $scriptDir "src\config.h"
$configRootPath = Join-Path $scriptDir "config.h"

if (-not (Test-Path $configSrcPath)) {
    if (Test-Path $configRootPath) {
        Write-Host "[INFO] Sincronizando 'config.h' hacia 'src/config.h' para PlatformIO..." -ForegroundColor Yellow
        Copy-Item -Path $configRootPath -Destination $configSrcPath -Force
    } else {
        Write-Host "`n[ERROR] Archivo de configuración requerido no encontrado: 'firmware/src/config.h'" -ForegroundColor Red
        Write-Host "[AYUDA] Debes crear 'config.h' a partir de 'config.example.h' antes de flashear:" -ForegroundColor Yellow
        Write-Host "        Copy-Item firmware/config.example.h firmware/src/config.h" -ForegroundColor White
        Write-Host "        (Y completa tus credenciales de WiFi y Supabase en dicho archivo)" -ForegroundColor Gray
        exit 1
    }
}

# 3. Ejecutar compilación y carga (upload) con PlatformIO
Write-Host "`n[INFO] Compilando y cargando firmware en el puerto $Port..." -ForegroundColor Green
try {
    Push-Location $scriptDir
    pio run --target upload --upload-port $Port
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n[ERROR] Falló la carga del firmware en el puerto $Port." -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "`n[ERROR] Ocurrió una excepción durante el proceso de flasheo: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}

# 4. Iniciar monitor serial
Write-Host "`n[INFO] Carga completada con éxito. Iniciando monitor serial en $Port a 115200 baudios..." -ForegroundColor Green
Write-Host "[INFO] Presiona Ctrl+C o Ctrl+] para salir del monitor serial." -ForegroundColor Gray
try {
    Push-Location $scriptDir
    pio device monitor --port $Port --baud 115200
} finally {
    Pop-Location
}

