import React, { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { listRecentTournaments, TournamentSummary } from "../services/apiClient";
import { Toolbar } from "./Toolbar";

interface HomePageProps {
  session: Session | null;
  onSignOut: () => Promise<void>;
}

export const HomePage: React.FC<HomePageProps> = ({ session, onSignOut }) => {
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadRecent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const recent = await listRecentTournaments();
        setTournaments(recent);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load recent tournaments.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadRecent();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Toolbar session={session} onSignOut={onSignOut} />
      <div className="p-4 md:p-8">
        <main className="max-w-4xl mx-auto">
          <section className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t("home.title")}</h1>
            <p className="text-slate-500 dark:text-slate-400">{t("home.subtitle")}</p>
          </section>

          {isLoading && <p className="text-slate-600 dark:text-slate-300">{t("home.loading")}</p>}
          {error && <p className="text-red-600 dark:text-red-300">{error}</p>}

          {!isLoading && !error && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tournaments.map((tournament) => (
                <div key={tournament.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{tournament.name}</h3>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{tournament.title}</p>
                  <button
                    type="button"
                    onClick={() => navigate(`/tournament/${tournament.urlSlug}?readonly=1`)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                  >
                    {t("home.viewTournament")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
