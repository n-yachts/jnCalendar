@echo off
rem Spusti jnCalendar na http://localhost:8080 a otevre ho v prohlizeci.
title jnCalendar
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" %*
