import React, { useEffect, useRef, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiSun, FiMoon, FiMoreVertical } from "react-icons/fi";
import i18n from "../i18n";
import { useTheme } from "../services/themeContext";

interface ToolbarProps {
  session: Session | null;
  onSignOut: () => Promise<void>;
}

const getInitials = (email: string): string => {
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
};

export const Toolbar: React.FC<ToolbarProps> = ({ session, onSignOut }) => {
  const { t } = useTranslation();
  const [lang, setLang] = useState(i18n.language);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [kebabOpen, setKebabOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const kebabRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const toggleLanguage = () => {
    const next = lang === "en" ? "es" : "en";
    void i18n.changeLanguage(next);
    localStorage.setItem("app_language", next);
    setLang(next);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(event.target as Node)) {
        setKebabOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const email = session?.user.email ?? "";
  const initials = email ? getInitials(email) : "";

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-slate-900 dark:text-white font-bold tracking-wide">
          <img src="/trophy.svg" alt="Trophy" className="w-7 h-7" />
          {t("app.name")}
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {/* Dashboard links for authenticated users */}
          {session && (
            <Link
              to="/dashboard"
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t("app.dashboard")}
            </Link>
          )}
          {!session ? (
            <Link
              to="/signin"
              state={{ background: location }}
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t("app.login")}
            </Link>
          ) : (
            <div className="relative" ref={userMenuRef}>
              {/* Login / User menu */}
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="border border-slate-300 dark:border-slate-500 dark:hover:bg-slate-600 dark:text-white flex font-bold h-8 hover:bg-slate-100 items-center justify-center rounded-full select-none text-slate-600 text-xs transition-colors w-8"
                title={email}
              >
                {initials}
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-2 z-20">
                  <p className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 truncate">
                    {email}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setUserMenuOpen(false); void onSignOut(); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    {t("app.logout")}
                  </button>
                </div>
              )}
            </div>
          )}
          {/* Kebab menu */}
          <div className="relative" ref={kebabRef}>
            <button
              type="button"
              onClick={() => setKebabOpen((open) => !open)}
              className="dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 dark:border-slate-600 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-md transition-colors"
              title="More options"
            >
              <FiMoreVertical className="w-4 h-4" />
            </button>
            {kebabOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-2 z-20">
                <button
                  type="button"
                  onClick={() => { toggleLanguage(); setKebabOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
                >
                  <span>{lang === "en" ? "Español" : "English"}</span>
                  <span className="text-xs font-semibold text-slate-400">{lang === "en" ? "ES" : "EN"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { toggleTheme(); setKebabOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
                >
                  <span>{theme === "dark" ? t("app.lightMode") : t("app.darkMode")}</span>
                  {theme === "dark" ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};
