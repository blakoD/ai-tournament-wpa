import React, { useEffect, useRef, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { HashRouter, Location, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from './services/themeContext';

import { Setup } from "./components/Setup";
import { AuthModal } from "./components/AuthModal";
import { SignInPage } from "./components/SignInPage";
import { SignUpPage } from "./components/SignUpPage";
import { TournamentView } from "./components/TournamentView";
import { OAuthConsent } from "./components/OAuthConsent";
import { HomePage } from "./components/HomePage";
import { Dashboard } from "./components/Dashboard";
import { Tournament, UserRole } from "./types";
import { getUserRole } from "./services/auth";
import {
  getReadOnlyParameter,
  getTournamentById,
  listTournaments,
  swapMatchParticipant,
  TournamentSummary,
  updateMatchResult,
  updateTournament,
} from "./services/apiClient";
import { supabase } from "./services/supabaseClient.js";

const isTournamentEditable = (
  summary: Pick<TournamentSummary, "ownerId" | "status" | "isSharedWithMe" | "sharesEnabled">,
  userId: string | undefined,
  role: UserRole
): boolean => {
  if (role === "admin") {
    return true;
  }

  if (!userId) {
    return false;
  }

  if (summary.ownerId === userId) {
    return summary.status !== "COMPLETED";
  }

  if (summary.isSharedWithMe && summary.sharesEnabled) {
    return summary.status !== "COMPLETED";
  }

  return false;
};

const LoadingView: React.FC = () => {
  const { t } = useTranslation();
  return <div className="p-8 text-center text-slate-400">{t('common.loading')}</div>;
};

const NotFoundView: React.FC = () => {
  const { t } = useTranslation();
  return <div className="p-8 text-center text-slate-400">{t('common.tournamentNotFound')}</div>;
};

const CheckingSessionView: React.FC = () => {
  const { t } = useTranslation();
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-300 flex items-center justify-center">{t('common.checkingSession')}</div>;
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

  // Capture search string at the time of each slug change only, so that
  // ?sort / ?view param updates from MatchList don't retrigger the data fetch.
  const searchAtSlugLoad = useRef(location.search);
  useEffect(() => {
    searchAtSlugLoad.current = location.search;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

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

        const canEditTournament = isTournamentEditable(summary, session?.user.id, role);

        const [loadedTournament, parameter] = await Promise.all([
          getTournamentById(summary.id),
          getReadOnlyParameter(),
        ]);
        setTournament(loadedTournament);
        setReadOnly(parameter.readOnly || !canEditTournament);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load tournament.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadTournament();
  }, [slug, navigate, role, session?.user.id]);

  const handleUpdate = async (updated: Tournament): Promise<Tournament> => {
    const persisted = await updateTournament(updated.id, updated);
    setTournament(persisted);
    return persisted;
  };

  const handleMatchResult = async (tournamentId: string, matchId: string, scoreA: number, scoreB: number, signal?: AbortSignal): Promise<Tournament> => {
    const persisted = await updateMatchResult(tournamentId, matchId, { scoreA, scoreB }, signal);
    setTournament(persisted);
    return persisted;
  };

  const handleSwapParticipant = async (tournamentId: string, matchId: string, slot: 'A' | 'B', newParticipantId: string): Promise<Tournament> => {
    const persisted = await swapMatchParticipant(tournamentId, matchId, { slot, newParticipantId });
    setTournament(persisted);
    return persisted;
  };

  if (isLoading) return <LoadingView />;
  if (error) return <div className="p-8 text-center text-red-300">{error}</div>;
  if (!tournament) return <NotFoundView />;

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

const AppContent: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const location = useLocation();
  const background = (location.state as { background?: Location } | null)?.background;

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

  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Failed to sign out user', error);
    }
    navigate('/');
  };

  const role = getUserRole(session);

  const guard = (element: React.ReactElement, requiredRole?: 'admin') => {
    if (isAuthLoading) {
      return <CheckingSessionView />;
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
    <>
      <Routes location={background ?? location}>
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
        <Route path="/create" element={guard(<Setup />)} />
        <Route path="/tournament/:slug" element={<TournamentRoute session={session} role={role} />} />
        <Route
          path="/oauth/consent"
          element={<OAuthConsent session={session} isAuthLoading={isAuthLoading} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {background && (
        <Routes>
          <Route path="/signin" element={session ? <Navigate to="/dashboard" replace /> : <AuthModal mode="signin" />} />
          <Route path="/signup" element={session ? <Navigate to="/dashboard" replace /> : <AuthModal mode="signup" />} />
        </Routes>
      )}
    </>
  );
};

const App: React.FC = () => (
  <ThemeProvider>
    <HashRouter>
      <AppContent />
    </HashRouter>
  </ThemeProvider>
);

export default App;