@echo off
title Servidor de teste - Fermentados da Maurinha
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
    py servidor.py
    goto fim
)
where python >nul 2>nul
if %errorlevel%==0 (
    python servidor.py
    goto fim
)

echo.
echo O Python nao foi encontrado neste computador.
echo.
echo Opcao 1: instale em https://www.python.org/downloads/
echo          (marque "Add python.exe to PATH" na instalacao)
echo Opcao 2: use o Live Server do VS Code (veja o LEIA-ME-REDE-LOCAL.md)
echo.
:fim
pause
