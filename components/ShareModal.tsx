import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  addTournamentShare,
  getTournamentShares,
  removeTournamentShare,
  setTournamentSharesEnabled,
  TournamentShare,
} from "../services/apiClient";

interface ShareModalProps {
  tournamentId: string;
  tournamentName: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ tournamentId, tournamentName, onClose }) => {
  const { t } = useTranslation();
  const [shares, setShares] = useState<TournamentShare[]>([]);
  const [sharesEnabled, setSharesEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadShares = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getTournamentShares(tournamentId);
        setShares(data.shares);
        setSharesEnabled(data.sharesEnabled);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("share.errorLoad"));
      } finally {
        setIsLoading(false);
      }
    };
    void loadShares();
  }, [tournamentId, t]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleAdd = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;

    // Basic email format guard
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("share.errorInvalidEmail"));
      return;
    }

    setIsAdding(true);
    setError(null);
    try {
      const data = await addTournamentShare(tournamentId, email);
      setShares(data.shares);
      setSharesEnabled(data.sharesEnabled);
      setEmailInput("");
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("share.errorAdd"));
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (shareId: string) => {
    setRemovingId(shareId);
    setError(null);
    try {
      await removeTournamentShare(tournamentId, shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("share.errorRemove"));
    } finally {
      setRemovingId(null);
    }
  };

  const handleToggleEnabled = async () => {
    setIsTogglingEnabled(true);
    setError(null);
    try {
      const data = await setTournamentSharesEnabled(tournamentId, !sharesEnabled);
      setSharesEnabled(data.sharesEnabled);
      setShares(data.shares);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("share.errorToggle"));
    } finally {
      setIsTogglingEnabled(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      void handleAdd();
    }
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("share.title")}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">{tournamentName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded"
            aria-label={t("common.cancel")}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Enable/Disable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("share.enableSharing")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("share.enableSharingHint")}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sharesEnabled}
              disabled={isTogglingEnabled || isLoading}
              onClick={() => void handleToggleEnabled()}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                sharesEnabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  sharesEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Add email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t("share.addEmail")}
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("share.emailPlaceholder")}
                disabled={isAdding}
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
              />
              <button
                onClick={() => void handleAdd()}
                disabled={isAdding || !emailInput.trim()}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {isAdding ? t("share.adding") : t("share.add")}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Share list */}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t("share.sharedWith")} ({shares.length})
            </p>
            {isLoading ? (
              <p className="text-sm text-slate-400 py-4 text-center">{t("common.loading")}</p>
            ) : shares.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">{t("share.noShares")}</p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {shares.map((share) => (
                  <li
                    key={share.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <span className="text-sm text-slate-800 dark:text-slate-200 truncate">{share.email}</span>
                    <button
                      onClick={() => void handleRemove(share.id)}
                      disabled={removingId === share.id}
                      className="shrink-0 text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={t("share.remove")}
                    >
                      {removingId === share.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-5 pt-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};
