import React from "react";
import { Session } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface ProfilePageProps {
  session: Session;
  role: "admin" | "user";
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ session, role }) => {
  const { t } = useTranslation();
  const user = session.user;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('profile.title')}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{t('profile.subtitle')}</p>
            </div>
            <Link
              to="/dashboard"
              className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {t('profile.backToDashboard')}
            </Link>
          </div>

          <div className="space-y-4 text-sm">
            <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400">{t('profile.email')}</p>
              <p className="text-slate-900 dark:text-slate-100 mt-1">{user.email ?? "N/A"}</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400">{t('profile.role')}</p>
              <p className="text-slate-900 dark:text-slate-100 mt-1 uppercase tracking-wide">{role}</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400">{t('profile.userId')}</p>
              <p className="text-slate-900 dark:text-slate-100 mt-1 break-all">{user.id}</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <p className="text-slate-500 dark:text-slate-400">{t('profile.provider')}</p>
              <p className="text-slate-900 dark:text-slate-100 mt-1">{user.app_metadata.provider ?? "email"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
