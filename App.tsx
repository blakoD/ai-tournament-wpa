import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { Setup } from './components/Setup';
import { TournamentView } from './components/TournamentView';
import { Tournament } from './types';
import { getTournamentById, listTournaments, TournamentSummary, updateTournament, updateMatchResult, swapMatchParticipant } from './services/apiClient';

const Dashboard = () => {
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadTournaments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const loadedTournaments = await listTournaments();
        setTournaments(loadedTournaments);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load tournaments.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadTournaments();
  }, []);

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Tournaments</h1>
            <p className="text-slate-400">Manage your competitions efficiently.</p>
          </div>
          <button
            onClick={() => navigate('/create')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            + New Tournament
          </button>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TournamentRoute = () => {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadTournament = async () => {
      if (!slug) {
        navigate('/');
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const summaries = await listTournaments();
        const summary = summaries.find((item) => item.urlSlug === slug);
        if (!summary) {
          navigate('/');
          return;
        }

        const loadedTournament = await getTournamentById(summary.id);
        setTournament(loadedTournament);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load tournament.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadTournament();
  }, [slug, navigate]);

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
      onUpdate={handleUpdate}
      onMatchResult={handleMatchResult}
      onSwapParticipant={handleSwapParticipant}
    />
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create" element={<Setup />} />
        <Route path="/tournament/:slug" element={<TournamentRoute />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;