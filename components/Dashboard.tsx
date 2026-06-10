import React, { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  deleteTournament,
  getReadOnlyParameter,
  listMyTournaments,
  listTournaments,
  TournamentSummary,
  updateReadOnlyParameter,
} from "../services/apiClient";
import { UserRole } from "../types";
import { Toolbar } from "./Toolbar";

interface DashboardProps {
  session: Session;
  role: UserRole;
  userEmail?: string;
  onSignOut: () => Promise<void>;
}

export const Dashboard = ({ session, role, userEmail, onSignOut }: DashboardProps) => {
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingTournamentId, setDeletingTournamentId] = useState<string | null>(null);
  const [unlockTapTimestamps, setUnlockTapTimestamps] = useState<number[]>([]);
  const [isTogglingReadOnly, setIsTogglingReadOnly] = useState(false);
  const [readOnly, setReadOnly] = useState(true);
  const navigate = useNavigate();
  const isAdmin = role === "admin";

  useEffect(() => {
    const loadTournaments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [loadedTournaments, parameter] = await Promise.all([
          isAdmin ? listTournaments() : listMyTournaments(),
          getReadOnlyParameter(),
        ]);
        setTournaments(loadedTournaments);
        setReadOnly(parameter.readOnly);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load tournaments.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadTournaments();
  }, [isAdmin]);

  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString();
  };

  const handleDeleteTournament = async (tournamentId: string, tournamentName: string) => {
    const shouldDelete = window.confirm(t("dashboard.deleteConfirm", { name: tournamentName }));
    if (!shouldDelete) {
      return;
    }

    setDeletingTournamentId(tournamentId);
    setError(null);

    try {
      await deleteTournament(tournamentId);
      setTournaments((previous) => previous.filter((tournament) => tournament.id !== tournamentId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete tournament.");
    } finally {
      setDeletingTournamentId(null);
    }
  };

  const handleToggleActionsFromTitle = async () => {
    if (!isAdmin || isLoading || isTogglingReadOnly || tournaments.length === 0) {
      return;
    }

    const now = Date.now();
    const recentTaps = [...unlockTapTimestamps, now].filter((timestamp) => now - timestamp <= 5000);

    if (recentTaps.length < 10) {
      setUnlockTapTimestamps(recentTaps);
      return;
    }

    setUnlockTapTimestamps([]);
    setError(null);
    setIsTogglingReadOnly(true);

    const nextReadOnly = !readOnly;

    try {
      const updated = await updateReadOnlyParameter(nextReadOnly);
      setReadOnly(updated.readOnly);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Failed to toggle actions visibility.");
    } finally {
      setIsTogglingReadOnly(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Toolbar session={session} onSignOut={onSignOut} />
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8 flex justify-between items-center">
            <div>
              <h1
                onClick={() => {
                  void handleToggleActionsFromTitle();
                }}
                className={`text-3xl font-bold text-slate-900 dark:text-white mb-2 select-none ${isAdmin ? "cursor-pointer" : ""}`}
              >
                {t("dashboard.title")}
              </h1>
              <p className="text-slate-500 dark:text-slate-400">{t("dashboard.subtitle")}</p>
              {userEmail && <p className="text-slate-500 text-sm mt-1">{t("dashboard.signedInAs", { email: userEmail })}</p>}
              { isAdmin && 
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/30 border border-blue-400/50 dark:border-blue-600/50 px-1.5 py-0.5 rounded-xl">
                  Admin
                </span> 
              }
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/create")}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
              >
                {t("dashboard.newTournament")}
              </button>
            </div>
          </header>

          {isLoading ? (
            <div className="text-center py-20 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-slate-600 dark:text-slate-300">{t("dashboard.loading")}</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700/60 px-6">
              <p className="text-red-600 dark:text-red-300 font-medium">{error}</p>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400 mb-4">{t("dashboard.noTournaments")}</p>
              <button
                onClick={() => navigate("/create")}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-semibold"
              >
                {t("dashboard.createFirst")}
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {tournaments.map((ts) => (
                <div
                  key={ts.id}
                  onClick={() => navigate(`/tournament/${ts.urlSlug}`)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl hover:border-blue-500/50 dark:hover:bg-slate-800/80 cursor-pointer transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {ts.name}
                    </h3>
                    <span
                      className={`ml-1 px-1 py-1 rounded-lg text-xs text-center uppercase ${
                        ts.status === "COMPLETED"
                          ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                          : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {ts.status === "COMPLETED" ? t("tournamentView.completed") : t("tournamentView.started")}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{ts.title}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                    <span>{t("dashboard.players", { count: ts.participantCount })}</span>
                    <span>•</span>
                    <span>{ts.eliminationType === "SINGLE_ELIMINATION" ? t("dashboard.bracketType") : t("dashboard.roundRobinType")}</span>
                  </div>
                  <div className="text-xs text-slate-500 border-t border-slate-200 dark:border-slate-700/50 pt-2 flex gap-2">
                    <span>{t("dashboard.started", { date: formatDate(ts.startedAt) })}</span>
                    {ts.completedAt && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-500/80">{t("dashboard.finished", { date: formatDate(ts.completedAt) })}</span>
                      </>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/50 flex justify-end">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteTournament(ts.id, ts.name);
                        }}
                        disabled={deletingTournamentId === ts.id}
                        className="text-xs bg-slate-50 dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-900/30 border border-slate-300 dark:border-slate-600 hover:border-red-400 dark:hover:border-red-500 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-300 px-3 py-1 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {deletingTournamentId === ts.id ? t("dashboard.deleting") : t("dashboard.delete")}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
