@echo off
setlocal enabledelayedexpansion
REM ─────────────────────────────────────────────────────────────────────────
REM n8n-local — Windows baslatma betigi
REM
REM Kullanim:
REM   run-windows.bat            n8n'i baslatir (http://localhost:5678)
REM   run-windows.bat --ai       n8n + yerel AI (Ollama) profilini baslatir
REM   run-windows.bat --stop     n8n'i durdurur (veriler korunur)
REM
REM Ayrintili kurulum ve Turkce rehber: RUNNING.md
REM ─────────────────────────────────────────────────────────────────────────

cd /d "%~dp0"

if /I "%~1"=="--stop" (
  echo [bilgi] n8n durduruluyor ^(veriler korunur^)...
  docker compose down
  if errorlevel 1 (
    echo [hata] durdurma basarisiz oldu.
    exit /b 1
  )
  echo [tamam] Durduruldu.
  exit /b 0
)

REM ── 1) Docker kurulu mu? ───────────────────────────────────────────────
where docker >nul 2>nul
if errorlevel 1 (
  echo [hata] Docker bulunamadi.
  echo.
  echo   Docker Desktop for Windows buradan indirilir:
  echo   https://www.docker.com/products/docker-desktop/
  echo.
  echo   Kurduktan sonra Docker Desktop uygulamasini bir kez acin, sonra bu
  echo   betigi tekrar calistirin: run-windows.bat
  exit /b 1
)

REM ── 2) Docker daemon calisiyor mu? ─────────────────────────────────────
docker info >nul 2>nul
if errorlevel 1 (
  echo [hata] Docker kurulu ama calismiyor.
  echo.
  echo   Docker Desktop uygulamasini acin, sistem tepsisindeki balina simgesi
  echo   "Docker Desktop is running" deyince bu betigi tekrar calistirin:
  echo   run-windows.bat
  exit /b 1
)
echo [tamam] Docker calisiyor.

REM ── 3) docker compose komutu var mi? ───────────────────────────────────
docker compose version >nul 2>nul
if errorlevel 1 (
  echo [hata] 'docker compose' bulunamadi. Docker Desktop'i guncelleyin:
  echo   https://www.docker.com/products/docker-desktop/
  exit /b 1
)

REM ── 4) .env dosyasi ─────────────────────────────────────────────────────
if not exist ".env" (
  echo [bilgi] .env dosyasi bulunamadi, .env.example kopyalaniyor...
  copy /Y ".env.example" ".env" >nul
  echo [tamam] .env olusturuldu.
  echo [bilgi] N8N_ENCRYPTION_KEY alanini .env dosyasinda doldurun.
  echo [bilgi]   PowerShell ile rastgele anahtar uretmek icin:
  echo [bilgi]   -join ((1..64) ^| ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
  echo [bilgi] Telegram botu gibi opsiyonel ozellikler icin .env dosyasini gozden gecirin.
) else (
  echo [bilgi] .env dosyasi zaten mevcut, dokunulmadi.
)

REM ── 5) local-files ornek veri dosyalari ────────────────────────────────
for %%F in (gorevler fiyat-takibi harcamalar notlar) do (
  if exist "local-files\%%F.ornek.json" if not exist "local-files\%%F.json" (
    copy /Y "local-files\%%F.ornek.json" "local-files\%%F.json" >nul
    echo [bilgi] local-files\%%F.json olusturuldu ^(ornek veriden^).
  )
)

REM ── 6) n8n'i baslat ─────────────────────────────────────────────────────
if /I "%~1"=="--ai" (
  echo [bilgi] n8n + yerel AI ^(Ollama^) baslatiliyor...
  docker compose --profile ai up -d
  if errorlevel 1 (
    echo [hata] baslatma basarisiz oldu. 'docker compose logs' ile kontrol edin.
    exit /b 1
  )
  echo [tamam] Baslatildi. Ollama modelini indirmeyi unutmayin:
  echo     docker exec -it ollama ollama pull qwen2.5:3b
) else (
  echo [bilgi] n8n baslatiliyor...
  docker compose up -d
  if errorlevel 1 (
    echo [hata] baslatma basarisiz oldu. 'docker compose logs' ile kontrol edin.
    exit /b 1
  )
)

echo [tamam] n8n calisiyor.
echo.
echo   Tarayicida acin: http://localhost:5678
echo.
echo   Durdurmak icin:  run-windows.bat --stop   ^(veya: docker compose down^)
echo   Ayrintili rehber: RUNNING.md

endlocal
