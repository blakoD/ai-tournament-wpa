/// <reference types="vite/client" />

// Runtime config written by docker-entrypoint.d/40-env-config.sh at container start.
interface Window {
  __ENV__?: {
    VITE_API_BASE_URL?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
}
