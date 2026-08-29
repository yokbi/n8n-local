#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# n8n-local — macOS (Intel) başlatma betiği
#
# Kullanım:
#   ./run-mac.sh              → n8n'i başlatır (http://localhost:5678)
#   ./run-mac.sh --ai         → n8n + yerel AI (Ollama) profilini başlatır
#   ./run-mac.sh --stop       → n8n'i durdurur (veriler korunur)
#
# Ayrıntılı kurulum ve Türkçe rehber: RUNNING.md
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

DOCKER_INSTALL_URL="https://www.docker.com/products/docker-desktop/"

info()  { printf '\033[1;34m[bilgi]\033[0m %s\n' "$1"; }
ok()    { printf '\033[1;32m[tamam]\033[0m %s\n' "$1"; }
err()   { printf '\033[1;31m[hata]\033[0m %s\n' "$1" >&2; }

# ── 0) --stop kısayolu ────────────────────────────────────────────────────
if [[ "${1:-}" == "--stop" ]]; then
  info "n8n durduruluyor (veriler korunur)..."
  docker compose down
  ok "Durduruldu."
  exit 0
fi

# ── 1) Docker kurulu mu? ──────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  err "Docker bulunamadı."
  echo ""
  echo "  Docker Desktop for Mac (Intel) buradan indirilir:"
  echo "  ${DOCKER_INSTALL_URL}"
  echo ""
  echo "  Kurduktan sonra Docker Desktop uygulamasını bir kez açın, sonra bu"
  echo "  betiği tekrar çalıştırın: ./run-mac.sh"
  exit 1
fi

# ── 2) Docker daemon çalışıyor mu? ────────────────────────────────────────
if ! docker info >/dev/null 2>&1; then
  err "Docker kurulu ama çalışmıyor."
  echo ""
  echo "  Docker Desktop uygulamasını (Launchpad / Applications) açın, balina"
  echo "  simgesi menü çubuğunda 'Docker Desktop is running' deyince bu"
  echo "  betiği tekrar çalıştırın: ./run-mac.sh"
  exit 1
fi
ok "Docker çalışıyor."

# ── 3) docker compose komutu var mı? ──────────────────────────────────────
if ! docker compose version >/dev/null 2>&1; then
  err "'docker compose' bulunamadı. Docker Desktop'ı güncelleyin: ${DOCKER_INSTALL_URL}"
  exit 1
fi

# ── 4) .env dosyası ────────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
  info ".env dosyası bulunamadı, .env.example kopyalanıyor..."
  cp .env.example .env
  # Rastgele şifreleme anahtarı üret ve otomatik yerleştir (openssl varsa).
  if command -v openssl >/dev/null 2>&1; then
    NEW_KEY=$(openssl rand -hex 32)
    # macOS/BSD sed: -i '' gerekir.
    sed -i '' "s/^N8N_ENCRYPTION_KEY=.*/N8N_ENCRYPTION_KEY=${NEW_KEY}/" .env
    ok ".env oluşturuldu ve N8N_ENCRYPTION_KEY otomatik üretildi."
  else
    ok ".env oluşturuldu."
    info "N8N_ENCRYPTION_KEY alanını .env dosyasında elle doldurmanız önerilir (openssl rand -hex 32)."
  fi
  info "Telegram botu gibi opsiyonel özellikler için .env dosyasını gözden geçirin."
else
  info ".env dosyası zaten mevcut, dokunulmadı."
fi

# ── 5) local-files örnek veri dosyaları ───────────────────────────────────
for f in gorevler fiyat-takibi harcamalar notlar; do
  if [[ -f "local-files/${f}.ornek.json" && ! -f "local-files/${f}.json" ]]; then
    cp "local-files/${f}.ornek.json" "local-files/${f}.json"
    info "local-files/${f}.json oluşturuldu (örnek veriden)."
  fi
done

# ── 6) n8n'i başlat ────────────────────────────────────────────────────────
if [[ "${1:-}" == "--ai" ]]; then
  info "n8n + yerel AI (Ollama) başlatılıyor..."
  docker compose --profile ai up -d
  ok "Başlatıldı. Ollama modelini indirmeyi unutmayın:"
  echo "    docker exec -it ollama ollama pull qwen2.5:3b"
else
  info "n8n başlatılıyor..."
  docker compose up -d
fi

ok "n8n çalışıyor."
echo ""
echo "  Tarayıcıda açın: http://localhost:5678"
echo ""
echo "  Durdurmak için:  ./run-mac.sh --stop   (veya: docker compose down)"
echo "  Ayrıntılı rehber: RUNNING.md"
