@echo off
echo ========================================
echo   RESTART SEGURO DO SERVIDOR DEV
echo ========================================
echo.
echo [1] Procurando processo na porta 3333...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3333') do (
    echo    - Encontrado processo PID: %%a
    echo    - Matando processo...
    taskkill /PID %%a /F 2>nul
    if %errorlevel% == 0 (
        echo    - Processo terminado com sucesso!
    ) else (
        echo    - Processo ja estava fechado
    )
)

echo.
echo [2] Limpando cache do Vite...
if exist "node_modules\.vite" (
    rmdir /s /q node_modules\.vite 2>nul
    echo    - Cache limpo!
) else (
    echo    - Cache ja estava limpo
)

echo.
echo [3] Iniciando servidor de desenvolvimento...
echo    - Porta: 3333
echo    - URL: http://localhost:3333
echo.
echo ========================================
npm run dev