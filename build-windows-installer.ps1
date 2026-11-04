[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  EcoPlaza Desktop - Constructor de Instaladores para Windows   " -ForegroundColor Cyan
Write-Host "  (Tauri 2 + Vite + React + Rust)                              " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Comprobación inicial del entorno de desarrollo
Write-Host "`n[1/5] Verificando herramientas del entorno..." -ForegroundColor Yellow

# Verificar Node.js
$nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "[ERROR] Node.js no está instalado o no se encuentra en el PATH." -ForegroundColor Red
    exit 1
}
$nodeVersion = node --version
Write-Host "  ✔ Node.js detectado: $nodeVersion" -ForegroundColor Green

# Verificar npm
$npmCmd = Get-Command "npm" -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    Write-Host "[ERROR] npm no está instalado o no se encuentra en el PATH." -ForegroundColor Red
    exit 1
}
$npmVersion = npm --version
Write-Host "  ✔ npm detectado: v$npmVersion" -ForegroundColor Green

# Verificar Cargo (Rust)
$cargoCmd = Get-Command "cargo" -ErrorAction SilentlyContinue
if (-not $cargoCmd) {
    Write-Host "`n[ADVERTENCIA] El compilador de Rust ('cargo') no se encuentra disponible en el PATH." -ForegroundColor Red
    Write-Host "[GUÍA] Para compilar la aplicación nativa de escritorio con Tauri 2 necesitas instalar Rust:" -ForegroundColor Yellow
    Write-Host "       1. Ingresa a https://rustup.rs/" -ForegroundColor White
    Write-Host "       2. Descarga y ejecuta rustup-init.exe" -ForegroundColor White
    Write-Host "       3. Selecciona la instalación por defecto (MSVC toolchain)" -ForegroundColor White
    Write-Host "       4. Reinicia tu terminal PowerShell e intenta nuevamente.`n" -ForegroundColor Yellow
    exit 1
}
$cargoVersion = cargo --version
Write-Host "  ✔ Rust / Cargo detectado: $cargoVersion" -ForegroundColor Green

# 2. Compilación del Frontend (TypeScript + Vite)
Write-Host "`n[2/5] Compilando frontend (tsc -b && vite build)..." -ForegroundColor Yellow
npm --prefix frontend run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Falló la compilación del frontend." -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "  ✔ Frontend compilado con éxito." -ForegroundColor Green

# 3. Verificación de Linter (ESLint)
Write-Host "`n[3/5] Ejecutando análisis estático (eslint .)..." -ForegroundColor Yellow
npm --prefix frontend run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Se encontraron violaciones en el análisis de ESLint." -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "  ✔ ESLint aprobado con 0 errores." -ForegroundColor Green

# 4. Ejecución de la Suite de Pruebas
Write-Host "`n[4/5] Ejecutando suite de pruebas automatizadas..." -ForegroundColor Yellow
npm --prefix frontend test -- --run
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] La suite de pruebas no pasó al 100%." -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "  ✔ Suite de pruebas aprobada al 100%." -ForegroundColor Green

# 5. Compilación del Instalador Nativo de Windows con Tauri 2
Write-Host "`n[5/5] Compilando empaquetado desktop nativo (Tauri 2 release)..." -ForegroundColor Yellow
npm --prefix frontend run desktop:build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Falló la compilación de Tauri 2 desktop:build." -ForegroundColor Red
    exit $LASTEXITCODE
}

# Resumen Final de Salida
Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "  ¡Compilación Desktop Finalizada Exitosamente!                 " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Artefactos generados por Tauri 2 disponibles en:" -ForegroundColor White
Write-Host "  • Binario ejecutable:" -ForegroundColor Gray
Write-Host "    frontend/src-tauri/target/release/EcoPlaza.exe" -ForegroundColor White
Write-Host "  • Instalador Windows MSI:" -ForegroundColor Gray
Write-Host "    frontend/src-tauri/target/release/bundle/msi/" -ForegroundColor White
Write-Host "  • Instalador Windows NSIS (Setup .exe):" -ForegroundColor Gray
Write-Host "    frontend/src-tauri/target/release/bundle/nsis/" -ForegroundColor White
Write-Host "=================================================================`n" -ForegroundColor Cyan

