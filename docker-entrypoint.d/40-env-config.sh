#!/bin/sh
# Writes runtime config (Fly secrets) for the SPA, since Vite only bakes env vars at build time.
set -eu

json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__ENV__ = {
  VITE_API_BASE_URL: "$(json_escape "${VITE_API_BASE_URL:-}")",
  VITE_SUPABASE_URL: "$(json_escape "${VITE_SUPABASE_URL:-}")",
  VITE_SUPABASE_ANON_KEY: "$(json_escape "${VITE_SUPABASE_ANON_KEY:-}")"
};
EOF
