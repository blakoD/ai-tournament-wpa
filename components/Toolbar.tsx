import React, { useState } from "react";
import { Session } from "@supabase/supabase-js";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiSun, FiMoon } from "react-icons/fi";
import i18n from "../i18n";
import { useTheme } from "../services/themeContext";

interface ToolbarProps {
  session: Session | null;
  onSignOut: () => Promise<void>;
}

export const Toolbar: React.FC<ToolbarProps> = ({ session, onSignOut }) => {
  const { t } = useTranslation();
  const [lang, setLang] = useState(i18n.language);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const toggleLanguage = () => {
    const next = lang === "en" ? "es" : "en";
    void i18n.changeLanguage(next);
    localStorage.setItem("app_language", next);
    setLang(next);
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-slate-900 dark:text-white font-bold tracking-wide">
          <img src="/trophy.svg" alt="Trophy" className="w-7 h-7" />
          {t("app.name")}
        </Link>

        <nav className="flex flex-wrap text-center justify-end gap-2 text-sm">
          {session && (
            <>
              <Link
                to="/dashboard"
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t("app.dashboard")}
              </Link>
              <button
                type="button"
                onClick={() => {
                  void onSignOut();
                }}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-md transition-colors"
              >
                {t("app.logout")}
              </button>
            </>
          )}
          {!session && (
            <div className="flex items-center gap-2">
              <Link
                to="/signin"
                state={{ background: location }}
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t("app.login")}
              </Link>
              <Link
                to="/signup"
                state={{ background: location }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md transition-colors"
              >
                {t("app.signup")}
              </Link>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleLanguage}
              className="ml-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded-md transition-colors text-xs font-semibold tracking-wide"
              title={lang === "en" ? "Cambiar a Español" : "Switch to English"}
            >
              {lang === "en" ? "ES" : "EN"}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-md transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};
