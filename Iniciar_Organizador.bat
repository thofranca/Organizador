@echo off
cd /d "d:\User\Documents\Organizador"
echo Iniciando o Organizador...
start /min cmd /c "npm run dev"
echo Aguardando o servidor iniciar...
timeout /t 3 /nobreak >nul
start http://localhost:5173
exit
