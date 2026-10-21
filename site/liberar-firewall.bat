@echo off
title Liberar o site de teste no Firewall do Windows
net session >nul 2>nul
if not %errorlevel%==0 (
    echo.
    echo Este arquivo precisa ser executado como ADMINISTRADOR.
    echo Clique com o botao direito nele e escolha "Executar como administrador".
    echo.
    pause
    exit /b
)
netsh advfirewall firewall add rule name="Site Maurinha 8000" dir=in action=allow protocol=TCP localport=8000 profile=private >nul
netsh advfirewall firewall add rule name="Site Maurinha 5500" dir=in action=allow protocol=TCP localport=5500 profile=private >nul
echo.
echo Pronto! As portas 8000 e 5500 foram liberadas para redes PRIVADAS (sua casa).
echo.
pause
