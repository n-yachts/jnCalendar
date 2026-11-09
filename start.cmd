@echo off
rem Spusti Lhutnik na http://localhost:8080 a otevre ho v prohlizeci.
title Lhutnik
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" %*
