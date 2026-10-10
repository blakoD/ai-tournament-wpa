import React, { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiShare2, FiTrash2, FiUsers } from "react-icons/fi";
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
import { ShareModal } from "./ShareModal";

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
  const [sharingTournament, setSharingTournament] = useState<TournamentSummary | null>(null);
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
    return new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
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
      {sharingTournament && (
        <ShareModal
          tournamentId={sharingTournament.id}
          tournamentName={sharingTournament.name}
          onClose={() => setSharingTournament(null)}
        />
      )}
      <div className="px-3 py-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-4 sm:mb-8 flex justify-between items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 sm:mb-2">
                <h1
                  onClick={() => {
                    void handleToggleActionsFromTitle();
                  }}
                  className={`text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white select-none ${isAdmin ? "cursor-pointer" : ""}`}
                >
                  {t("dashboard.title")}
                </h1>
                { isAdmin &&
                  <span className="shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/30 border border-blue-400/50 dark:border-blue-600/50 px-1.5 py-0.5 rounded-xl">
                    Admin
                  </span>
                }
              </div>
              <p className="hidden sm:block text-slate-500 dark:text-slate-400">{t("dashboard.subtitle")}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => navigate("/create")}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors shadow-lg shadow-blue-900/20"
              >
                {t("dashboard.newTournament")}
              </button>
            </div>
          </header>

          {isLoading ? (
            <div className="text-center py-10 sm:py-20 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-slate-600 dark:text-slate-300">{t("dashboard.loading")}</p>
            </div>
          ) : error ? (
            <div className="text-center py-10 sm:py-20 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700/60 px-6">
              <p className="text-red-600 dark:text-red-300 font-medium">{error}</p>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-10 sm:py-20 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
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
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="min-w-0 break-words text-lg sm:text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {ts.name}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                      {!readOnly && ts.ownerId !== session.user.id && (
                        <span
                          className="p-2 text-blue-600 dark:text-blue-400"
                          title={t("share.sharedWithMe")}
                          aria-label={t("share.sharedWithMe")}
                          role="img"
                        >
                          <FiUsers className="w-4 h-4" />
                        </span>
                      )}
                      {!readOnly && ts.ownerId === session.user.id && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSharingTournament(ts);
                          }}
                          title={t("share.title")}
                          aria-label={t("share.title")}
                          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                        >
                          <FiShare2 className="w-4 h-4" />
                        </button>
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteTournament(ts.id, ts.name);
                          }}
                          disabled={deletingTournamentId === ts.id}
                          title={deletingTournamentId === ts.id ? t("dashboard.deleting") : t("dashboard.delete")}
                          aria-label={deletingTournamentId === ts.id ? t("dashboard.deleting") : t("dashboard.delete")}
                          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <FiTrash2 className={`w-4 h-4 ${deletingTournamentId === ts.id ? "animate-pulse" : ""}`} />
                        </button>
                      )}
                      <span
                        className={`ml-1 shrink-0 whitespace-nowrap px-1 py-1 rounded-lg text-xs text-center uppercase ${
                          ts.status === "COMPLETED"
                            ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                            : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {ts.status === "COMPLETED" ? t("tournamentView.completed") : t("tournamentView.started")}
                      </span>
                    </div>
                  </div>
                  {ts.title?.trim() && ts.title.trim() !== ts.name.trim() && (
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-2 break-words">{ts.title}</p>
                  )}
                  {ts.description?.trim() && (
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-2 break-words line-clamp-2" title={ts.description}>
                      {ts.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500 mb-2">
                    <span>{t("dashboard.players", { count: ts.participantCount })}</span>
                    <span>•</span>
                    <span>{ts.eliminationType === "SINGLE_ELIMINATION" ? t("dashboard.bracketType") : t("dashboard.roundRobinType")}</span>
                  </div>
                  <div className="text-xs text-slate-500 border-t border-slate-200 dark:border-slate-700/50 pt-2 flex flex-wrap gap-x-2 gap-y-0.5">
                    <span>{t("dashboard.started", { date: formatDate(ts.startedAt) })}</span>
                    {ts.completedAt && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-500/80">{t("dashboard.finished", { date: formatDate(ts.completedAt) })}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
