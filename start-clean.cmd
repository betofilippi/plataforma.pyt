@echo off
echo Limpando ambiente...

REM Limpar cache do Vite
echo Removendo cache do Vite...
rmdir /s /q node_modules\.vite 2>nul

REM Limpar pasta temporária
echo Limpando temporários...
del /q /s node_modules\.vite\deps_temp_* 2>nul

REM Iniciar servidor
echo Iniciando servidor limpo...
npm run dev