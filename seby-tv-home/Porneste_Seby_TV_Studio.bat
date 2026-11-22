@echo off
title Seby TV Studio - Control Center & LAN Cast
echo Pornire Seby TV Studio pe http://localhost:8765 ...
start "" "http://localhost:8765"
python "%~dp0seby_tv_studio.py"
pause

