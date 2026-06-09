import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";
import { FiShield, FiAlertTriangle, FiCheck, FiX } from "react-icons/fi";

interface OAuthConsentProps {
  session: Session | null;
  isAuthLoading: boolean;
}

interface ConsentParams {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  responseType: string;
}

// Allowed redirect URI origins – prevents open redirect attacks.
// In a real deployment, these would be stored per client_id in the database.
const ALLOWED_REDIRECT_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  "https://fronton-torneos-web.fly.dev",
]);

function isAllowedRedirectUri(raw: string): boolean {
  try {
    const url = new URL(raw);
    return ALLOWED_REDIRECT_ORIGINS.has(url.origin);
  } catch {
    return false;
  }
}

/** Scope labels that the consent UI knows how to display. */
const SCOPE_META: Record<string, { labelKey: string; descriptionKey: string }> = {
  "tournament:read": {
    labelKey: "oauth.scope.tournamentRead",
    descriptionKey: "oauth.scope.tournamentReadDesc",
  },
  "tournament:write": {
    labelKey: "oauth.scope.tournamentWrite",
    descriptionKey: "oauth.scope.tournamentWriteDesc",
  },
  "profile:read": {
    labelKey: "oauth.scope.profileRead",
    descriptionKey: "oauth.scope.profileReadDesc",
  },
  openid: {
    labelKey: "oauth.scope.openid",
    descriptionKey: "oauth.scope.openidDesc",
  },
  email: {
    labelKey: "oauth.scope.email",
    descriptionKey: "oauth.scope.emailDesc",
  },
};

const DEFAULT_SCOPE_META = {
  labelKey: "oauth.scope.unknown",
  descriptionKey: "oauth.scope.unknownDesc",
};

export const OAuthConsent: React.FC<OAuthConsentProps> = ({
  session,
  isAuthLoading,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDenying, setIsDenying] = useState(false);
  const [isAllowing, setIsAllowing] = useState(false);

  const params = useMemo<ConsentParams | null>(() => {
    const search = new URLSearchParams(location.search);
    const clientId = search.get("client_id") ?? "";
    const redirectUri = search.get("redirect_uri") ?? "";
    const scope = search.get("scope") ?? "openid";
    const state = search.get("state") ?? "";
    const responseType = search.get("response_type") ?? "code";
    if (!clientId || !redirectUri) return null;
    return { clientId, redirectUri, scope, state, responseType };
  }, [location.search]);

  // Redirect to sign-in if not authenticated (preserving the consent URL).
  useEffect(() => {
    if (isAuthLoading) return;
    if (!session) {
      navigate("/signin", {
        state: { background: location, returnTo: location.pathname + location.search },
      });
    }
  }, [isAuthLoading, session, navigate, location]);

  const scopes = useMemo(
    () => (params?.scope ?? "").split(/\s+/).filter(Boolean),
    [params]
  );

  const isValidRedirectUri = useMemo(
    () => params !== null && isAllowedRedirectUri(params.redirectUri),
    [params]
  );

  const handleAllow = () => {
    if (!params || !isValidRedirectUri) return;
    setIsAllowing(true);

    // Generate a short-lived opaque authorization code.
    // In production this would be stored server-side and exchanged for tokens.
    const code = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const redirect = new URL(params.redirectUri);
    redirect.searchParams.set("code", code);
    if (params.state) {
      redirect.searchParams.set("state", params.state);
    }
    window.location.href = redirect.toString();
  };

  const handleDeny = () => {
    if (!params) {
      navigate("/");
      return;
    }
    setIsDenying(true);

    if (isValidRedirectUri) {
      const redirect = new URL(params.redirectUri);
      redirect.searchParams.set("error", "access_denied");
      redirect.searchParams.set("error_description", "The user denied the authorization request.");
      if (params.state) {
        redirect.searchParams.set("state", params.state);
      }
      window.location.href = redirect.toString();
    } else {
      navigate("/");
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">{t("common.checkingSession")}</p>
      </div>
    );
  }

  if (!session) {
    // Redirecting – render nothing while the effect fires.
    return null;
  }

  if (!params) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-800 shadow-lg p-8 text-center">
          <FiAlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {t("oauth.invalidRequest")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            {t("oauth.missingParams")}
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg transition-colors"
          >
            {t("oauth.goHome")}
          </button>
        </div>
      </div>
    );
  }

  if (!isValidRedirectUri) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-800 shadow-lg p-8 text-center">
          <FiAlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {t("oauth.untrustedRedirect")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">
            {t("oauth.untrustedRedirectDesc")}
          </p>
          <code className="block text-xs bg-slate-100 dark:bg-slate-800 rounded px-3 py-2 text-slate-600 dark:text-slate-300 break-all mb-6">
            {params.redirectUri}
          </code>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg transition-colors"
          >
            {t("oauth.goHome")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-8 py-6 text-center">
          <FiShield className="w-10 h-10 text-white mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">{t("oauth.title")}</h1>
          <p className="text-blue-100 text-sm mt-1">{t("oauth.subtitle")}</p>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          {/* Requesting app + user */}
          <div className="mb-6">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">
              {t("oauth.requestingApp")}
            </p>
            <p className="font-semibold text-slate-900 dark:text-white text-lg break-all">
              {params.clientId}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 break-all">
              {t("oauth.redirectsTo")} {params.redirectUri}
            </p>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 mb-6" />

          {/* User identity */}
          <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-3">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">
              {t("oauth.signingInAs")}
            </p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 break-all">
              {session.user.email}
            </p>
          </div>

          {/* Scopes */}
          <div className="mb-8">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              {t("oauth.willBeAbleTo")}
            </p>
            <ul className="space-y-3">
              {scopes.map((scope) => {
                const meta = SCOPE_META[scope] ?? DEFAULT_SCOPE_META;
                return (
                  <li key={scope} className="flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <FiCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {t(meta.labelKey, { defaultValue: scope })}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t(meta.descriptionKey, { defaultValue: "" })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDeny}
              disabled={isDenying || isAllowing}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <FiX className="w-4 h-4" />
              {isDenying ? t("oauth.denying") : t("oauth.deny")}
            </button>
            <button
              type="button"
              onClick={handleAllow}
              disabled={isDenying || isAllowing}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
            >
              <FiCheck className="w-4 h-4" />
              {isAllowing ? t("oauth.allowing") : t("oauth.allow")}
            </button>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-4">
            {t("oauth.revokeHint")}
          </p>
        </div>
      </div>
    </div>
  );
};
