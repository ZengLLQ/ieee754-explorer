$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "Building ieee754-core for wasm32-unknown-unknown (release)..."
Push-Location $RepoRoot
try {
    cargo build -p ieee754-core --target wasm32-unknown-unknown --release
    $WasmSrc = Join-Path $RepoRoot "target\wasm32-unknown-unknown\release\ieee754_core.wasm"
    $WasmDstDir = Join-Path $RepoRoot "apps\web\public\wasm"
    New-Item -ItemType Directory -Force -Path $WasmDstDir | Out-Null
    $WasmDst = Join-Path $WasmDstDir "ieee754_core.wasm"
    Copy-Item $WasmSrc $WasmDst -Force
    Write-Host "Copied WASM binary to $WasmDst"
} finally {
    Pop-Location
}
