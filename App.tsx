import React, { useEffect, useMemo, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { HashRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";

import { ProfilePage } from "./components/ProfilePage";
import { Setup } from "./components/Setup";
import { SignInPage } from "./components/SignInPage";
import { SignUpPage } from "./components/SignUpPage";
import { TournamentView } from "./components/TournamentView";
import { Tournament } from "./types";
import { getUserRole } from "./services/auth";
import {
  deleteTournament,
  getReadOnlyParameter,
  getTournamentById,
  listMyTournaments,
  listRecentTournaments,
  listTournaments,
  swapMatchParticipant,
  TournamentSummary,
  updateMatchResult,
  updateReadOnlyParameter,
  updateTournament,
} from "./services/apiClient";
import { supabase } from "./services/supabaseClient.js";

type UserRole = "admin" | "user";

const isTournamentEditable = (
  summary: Pick<TournamentSummary, "ownerId" | "status">,
  userId: string | undefined,
  role: UserRole
): boolean => {
  if (role === "admin") {
    return true;
  }

  if (!userId || summary.ownerId !== userId) {
    return false;
  }

  return summary.status !== "COMPLETED";
};

interface ToolbarProps {
  session: Session | null;
  onSignOut: () => Promise<void>;
}

const Toolbar: React.FC<ToolbarProps> = ({ session, onSignOut }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-white font-bold tracking-wide">
          Tournament Builder
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link to="/" className="text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors">
            Inicio
          </Link>
          {session && (
            <>
              <Link
                to="/dashboard"
                className="text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                className="text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
              >
                Perfil
              </Link>
              <button
                type="button"
                onClick={() => {
                  void onSignOut();
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 px-3 py-1.5 rounded-md transition-colors"
              >
                Logout
              </button>
            </>
          )}
          {!session && (
            <>
              <Link
                to="/signin"
                className="text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

interface HomePageProps {
  session: Session | null;
  onSignOut: () => Promise<void>;
}

const HomePage: React.FC<HomePageProps> = ({ session, onSignOut }) => {
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
    <div className="min-h-screen bg-slate-950">
      <Toolbar session={session} onSignOut={onSignOut} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <section className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Ultimos torneos</h1>
          <p className="text-slate-400">Se muestran en modo lectura. Solo puedes editarlos desde Dashboard si tienes permiso.</p>
        </section>

        {isLoading && <p className="text-slate-300">Loading tournaments...</p>}
        {error && <p className="text-red-300">{error}</p>}

        {!isLoading && !error && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tournaments.map((tournament) => (
              <div key={tournament.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">{tournament.name}</h3>
                  <span className="text-[11px] uppercase tracking-wide bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded">
                    Read only
                  </span>
                </div>
                <p className="text-slate-400 text-sm mb-4">{tournament.title}</p>
                <button
                  type="button"
                  onClick={() => navigate(`/tournament/${tournament.urlSlug}?readonly=1`)}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Ver torneo
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

interface DashboardProps {
  session: Session;
  role: UserRole;
  userEmail?: string;
  onSignOut: () => Promise<void>;
}

const Dashboard = ({ session, role, userEmail, onSignOut }: DashboardProps) => {
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
        setError(loadError instanceof Error ? loadError.message : 'Failed to load tournaments.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadTournaments();
  }, [isAdmin]);

  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString();
  };

  const handleDeleteTournament = async (tournamentId: string, tournamentName: string) => {
    const shouldDelete = window.confirm(`Delete tournament \"${tournamentName}\"? This action cannot be undone.`);
    if (!shouldDelete) {
      return;
    }

    setDeletingTournamentId(tournamentId);
    setError(null);

    try {
      await deleteTournament(tournamentId);
      setTournaments((previous) => previous.filter((tournament) => tournament.id !== tournamentId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete tournament.');
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
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to toggle actions visibility.');
    } finally {
      setIsTogglingReadOnly(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Toolbar session={session} onSignOut={onSignOut} />
      <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1
              onClick={() => {
                void handleToggleActionsFromTitle();
              }}
              className={`text-3xl font-bold text-white mb-2 select-none ${isAdmin ? 'cursor-pointer' : ''}`}
              title="Tournaments"
            >
              My Tournaments
            </h1>
            <p className="text-slate-400">Manage your competitions efficiently.</p>
            {userEmail && <p className="text-slate-500 text-sm mt-1">Signed in as {userEmail}</p>}
            <p className="text-slate-500 text-xs mt-1">Role: {isAdmin ? 'admin' : 'user'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/create')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
              + New Tournament
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="text-center py-20 bg-slate-800/50 rounded-xl border border-slate-700">
            <p className="text-slate-300">Loading tournaments...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-red-900/20 rounded-xl border border-red-700/60 px-6">
            <p className="text-red-300 font-medium">{error}</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/50 rounded-xl border border-slate-700">
            <p className="text-slate-400 mb-4">No active tournaments found.</p>
            <button
              onClick={() => navigate('/create')}
              className="text-blue-400 hover:text-blue-300 font-semibold"
            >
              Create your first one
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {tournaments.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tournament/${t.urlSlug}`)}
                className="bg-slate-800 border border-slate-700 p-6 rounded-xl hover:border-blue-500/50 hover:bg-slate-800/80 cursor-pointer transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                    {t.name}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                    t.status === 'COMPLETED' ? 'bg-green-900 text-green-300' : 'bg-amber-900 text-amber-300'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-slate-400 text-sm mb-4">{t.title}</p>
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                  <span>{t.participantCount} Players</span>
                  <span>•</span>
                  <span>{t.eliminationType === 'SINGLE_ELIMINATION' ? 'Bracket' : '2nd Round Robin'}</span>
                </div>
                <div className="text-xs text-slate-500 border-t border-slate-700/50 pt-2 flex gap-2">
                     <span>Started: {formatDate(t.startedAt)}</span>
                     {t.completedAt && (
                         <>
                            <span>•</span>
                            <span className="text-emerald-500/80">Finished: {formatDate(t.completedAt)}</span>
                         </>
                     )}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-end">
                  {/* TODO isTournamentEditable(t, session.user.id, role) */}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteTournament(t.id, t.name);
                      }}
                      disabled={deletingTournamentId === t.id}
                      className="text-xs bg-slate-900 hover:bg-red-900/30 border border-slate-600 hover:border-red-500 text-slate-300 hover:text-red-300 px-3 py-1.5 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {deletingTournamentId === t.id ? 'Deleting...' : 'Delete'}
                    </button>
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

interface TournamentRouteProps {
  session: Session | null;
  role: UserRole;
}

const TournamentRoute = ({ session, role }: TournamentRouteProps) => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [readOnly, setReadOnly] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadTournament = async () => {
      if (!slug) {
        navigate('/dashboard');
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const summaries = await listTournaments();
        const summary = summaries.find((item) => item.urlSlug === slug);
        if (!summary) {
          navigate('/dashboard');
          return;
        }

        const query = new URLSearchParams(location.search);
        const forceReadOnly = query.get("readonly") === "1";
        const canEditTournament = isTournamentEditable(summary, session?.user.id, role);

        const [loadedTournament, parameter] = await Promise.all([
          getTournamentById(summary.id),
          getReadOnlyParameter(),
        ]);
        setTournament(loadedTournament);
        setReadOnly(parameter.readOnly || forceReadOnly || !canEditTournament);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load tournament.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadTournament();
  }, [slug, navigate, location.search, role, session?.user.id]);

  const handleUpdate = async (updated: Tournament): Promise<Tournament> => {
    const persisted = await updateTournament(updated.id, updated);
    setTournament(persisted);
    return persisted;
  };

  const handleMatchResult = async (tournamentId: string, matchId: string, scoreA: number, scoreB: number): Promise<Tournament> => {
    const persisted = await updateMatchResult(tournamentId, matchId, { scoreA, scoreB });
    setTournament(persisted);
    return persisted;
  };

  const handleSwapParticipant = async (tournamentId: string, matchId: string, slot: 'A' | 'B', newParticipantId: string): Promise<Tournament> => {
    const persisted = await swapMatchParticipant(tournamentId, matchId, { slot, newParticipantId });
    setTournament(persisted);
    return persisted;
  };

  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-300">{error}</div>;
  if (!tournament) return <div className="p-8 text-center text-slate-400">Tournament not found.</div>;

  return (
    <TournamentView
      tournament={tournament}
      readOnly={readOnly}
      onUpdate={handleUpdate}
      onMatchResult={handleMatchResult}
      onSwapParticipant={handleSwapParticipant}
    />
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Failed to retrieve Supabase session', error);
      }

      if (isMounted) {
        setSession(data.session ?? null);
        setIsAuthLoading(false);
      }
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Failed to sign out user', error);
    }
  };

  const role = getUserRole(session);

  const guard = (element: React.ReactElement, requiredRole?: 'admin') => {
    if (isAuthLoading) {
      return <div className="min-h-screen bg-slate-900 text-slate-300 flex items-center justify-center">Checking session...</div>;
    }
    if (!session) {
      return <Navigate to="/signin" replace />;
    }
    if (requiredRole === 'admin' && role !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    return element;
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage session={session} onSignOut={handleSignOut} />} />
        <Route path="/signin" element={session ? <Navigate to="/dashboard" replace /> : <SignInPage />} />
        <Route path="/signup" element={session ? <Navigate to="/dashboard" replace /> : <SignUpPage />} />
        <Route
          path="/dashboard"
          element={
            guard(
              session ? <Dashboard session={session} role={role} userEmail={session.user.email} onSignOut={handleSignOut} /> : <div />
            )
          }
        />
        <Route path="/profile" element={guard(session ? <ProfilePage session={session} role={role} /> : <div />)} />
        <Route path="/create" element={guard(<Setup />)} />
        <Route path="/tournament/:slug" element={<TournamentRoute session={session} role={role} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;