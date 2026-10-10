import React, { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiChevronRight } from "react-icons/fi";
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

  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Toolbar session={session} onSignOut={onSignOut} />
      <div className="px-3 py-4 sm:p-6 md:p-8">
        <main className="max-w-4xl mx-auto">
          <section className="mb-4 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1">{t("home.title")}</h1>
            <p className="text-slate-500 dark:text-slate-400">{t("home.subtitle")}</p>
          </section>

          {isLoading && <p className="text-slate-600 dark:text-slate-300">{t("home.loading")}</p>}
          {error && <p className="text-red-600 dark:text-red-300">{error}</p>}

          {!isLoading && !error && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/tournament/${tournament.urlSlug}?readonly=1`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      navigate(`/tournament/${tournament.urlSlug}?readonly=1`);
                    }
                  }}
                  title={t("home.viewTournament")}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-500/50 dark:hover:bg-slate-800/80 cursor-pointer transition-all group flex items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 text-lg font-semibold text-slate-900 dark:text-white break-words group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{tournament.name}</h3>
                      {(tournament.status === "STARTED" || tournament.status === "COMPLETED") && (
                        <span
                          className={`mt-0.5 shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded-lg text-[11px] text-center uppercase ${
                            tournament.status === "COMPLETED"
                              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                              : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {tournament.status === "COMPLETED" ? t("tournamentView.completed") : t("tournamentView.started")}
                        </span>
                      )}
                    </div>
                    {tournament.title?.trim() && tournament.title.trim() !== tournament.name.trim() && (
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 break-words">{tournament.title}</p>
                    )}
                    {tournament.description?.trim() && (
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 break-words line-clamp-2" title={tournament.description}>
                        {tournament.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {tournament.participantCount > 0 && (
                        <span>{t("dashboard.players", { count: tournament.participantCount })}</span>
                      )}
                      {tournament.status === "STARTED" && tournament.startedAt && (
                        <>
                          {tournament.participantCount > 0 && <span aria-hidden="true">•</span>}
                          <span>{t("dashboard.started", { date: formatDate(tournament.startedAt) })}</span>
                        </>
                      )}
                      {tournament.status === "COMPLETED" && tournament.completedAt && (
                        <>
                          {tournament.participantCount > 0 && <span aria-hidden="true">•</span>}
                          <span className="text-emerald-600 dark:text-emerald-500/80">{t("dashboard.finished", { date: formatDate(tournament.completedAt) })}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <FiChevronRight className="w-5 h-5 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" aria-hidden="true" />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
