import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tournament, Match, StageType, TournamentStatus, Participant, EliminationType } from '../types';
import { calculateStandings, advanceToStep2, generateId } from '../services/tournamentLogic';
import { Standings } from './Standings';
import { MatchList } from './MatchList';
import { BracketView } from './BracketView';
import { MatchModal } from './MatchModal';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  tournament: Tournament;
  onUpdate: (t: Tournament) => void;
}

export const TournamentView: React.FC<Props> = ({ tournament, onUpdate }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'standings' | 'matches-rr1' | 'matches-step2'>('standings');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  // History for Undo functionality
  const [history, setHistory] = useState<Tournament[]>([]);

  // Confirmation Dialog State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Recalculate standings whenever matches change
  const standings = useMemo(() => {
    return calculateStandings(tournament.participants, tournament.matches, StageType.RR1);
  }, [tournament.participants, tournament.matches]);

  // Step 2 matches existence check
  const hasStep2 = tournament.matches.some(m => m.stage !== StageType.RR1);
  const isRR1Complete = tournament.matches.filter(m => m.stage === StageType.RR1).every(m => m.isCompleted);

  const openConfirm = (title: string, message: string, action: () => void) => {
      setConfirmConfig({
          isOpen: true,
          title,
          message,
          onConfirm: () => {
              action();
              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  // Wrapper to save history before updating
  const updateWithHistory = (newTournament: Tournament) => {
    setHistory(prev => [...prev, tournament]);
    onUpdate(newTournament);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    onUpdate(previous);
  };

  const handleMatchSave = (matchId: string, scoreA: number, scoreB: number) => {
    const newMatches = tournament.matches.map(m => {
      if (m.id !== matchId) return m;
      
      // Calculate winner
      const winnerId = scoreA > scoreB ? m.participantAId : m.participantBId;
      
      return {
        ...m,
        scoreA,
        scoreB,
        winnerId,
        isCompleted: true
      };
    });

    // Bracket Advancement Logic
    const currentMatch = newMatches.find(m => m.id === matchId);
    if (currentMatch && currentMatch.nextMatchId && currentMatch.winnerId) {
        const nextIndex = newMatches.findIndex(nm => nm.id === currentMatch.nextMatchId);
        if (nextIndex !== -1) {
            const nextMatch = { ...newMatches[nextIndex] };
            if (currentMatch.nextMatchSlot === 'A') nextMatch.participantAId = currentMatch.winnerId;
            if (currentMatch.nextMatchSlot === 'B') nextMatch.participantBId = currentMatch.winnerId;
            newMatches[nextIndex] = nextMatch;
        }
    }

    // Check for tournament completion
    // Completed if Step 2 matches exist and all are done.
    let newStatus = tournament.status;
    let newCompletedAt = tournament.completedAt;

    const step2Matches = newMatches.filter(m => m.stage !== StageType.RR1);
    if (step2Matches.length > 0) {
         const allDone = step2Matches.every(m => m.isCompleted);
         if (allDone) {
             newStatus = TournamentStatus.COMPLETED;
             newCompletedAt = Date.now();
         }
    }

    updateWithHistory({
      ...tournament,
      matches: newMatches,
      status: newStatus,
      completedAt: newCompletedAt
    });
    setSelectedMatch(null);
  };

  const handleMatchReset = () => {
    if (!selectedMatch) return;
    
    openConfirm(
        "Reset Match Result?",
        "Are you sure? This will clear the scores and winner. If this is a bracket match, it will clear the participant slot in the next match.",
        () => {
            const matchId = selectedMatch.id;
            const newMatches = tournament.matches.map(m => {
                if (m.id === matchId) {
                    return {
                        ...m,
                        scoreA: null,
                        scoreB: null,
                        winnerId: null,
                        isCompleted: false
                    };
                }
                return m;
            });

            // Bracket propagation: Clear next match slot if it exists
            if (selectedMatch.nextMatchId) {
                 const nextIndex = newMatches.findIndex(nm => nm.id === selectedMatch.nextMatchId);
                 if (nextIndex !== -1) {
                     const nextMatch = { ...newMatches[nextIndex] };
                     if (selectedMatch.nextMatchSlot === 'A') nextMatch.participantAId = null;
                     if (selectedMatch.nextMatchSlot === 'B') nextMatch.participantBId = null;
                     newMatches[nextIndex] = nextMatch;
                 }
            }

            // Check if we should un-complete the tournament
            let newStatus = tournament.status;
            let newCompletedAt = tournament.completedAt;
            
            const step2Matches = newMatches.filter(m => m.stage !== StageType.RR1);
            if (step2Matches.length > 0) {
                const allDone = step2Matches.every(m => m.isCompleted);
                if (!allDone && newStatus === TournamentStatus.COMPLETED) {
                    newStatus = TournamentStatus.STARTED;
                    newCompletedAt = undefined;
                }
            }

            updateWithHistory({ 
                ...tournament, 
                matches: newMatches,
                status: newStatus,
                completedAt: newCompletedAt
            });
            setSelectedMatch(null);
        }
    );
  };

  const handleStartStep2 = () => {
    openConfirm(
        "Start Stage 2?",
        "Are you sure you want to end Stage 1 and generate Stage 2 matches? This cannot be undone (except via Undo).",
        () => {
            const updated = advanceToStep2(tournament);
            updateWithHistory(updated);
            setActiveTab('matches-step2');
        }
    );
  };

  const handleReplaceParticipant = (oldId: string, newName: string) => {
    const newId = generateId();
    const newParticipants = tournament.participants.map(p => {
        if (p.id === oldId) {
            return { 
                ...p, 
                name: newName, 
                id: newId, 
                originalId: oldId,
                isDropped: false 
            };
        }
        return p;
    });
    // Replaced participant takes the spot in Step 2 matches
    const newMatches = tournament.matches.map(m => {
        let mA = m.participantAId;
        let mB = m.participantBId;
        if (mA === oldId) mA = newId;
        if (mB === oldId) mB = newId;
        return { ...m, participantAId: mA, participantBId: mB };
    });
    
    updateWithHistory({ ...tournament, participants: newParticipants, matches: newMatches });
  };
  
  const handleManualRank = (id: string, val: number) => {
      const newParticipants = tournament.participants.map(p => 
        p.id === id ? { ...p, manualRankAdjustment: val } : p
      );
      updateWithHistory({ ...tournament, participants: newParticipants });
  };

  const handleSimulateResults = () => {
    openConfirm(
        "Simulate Results?",
        "This will simulate random scores for all remaining Round Robin matches. Existing results will not be changed.",
        () => {
            const newMatches = tournament.matches.map(m => {
                if (m.stage === StageType.RR1 && !m.isCompleted) {
                    const winA = Math.random() > 0.5;
                    const winnerScore = 16;
                    const loserScore = Math.floor(Math.random() * 15); // 0-14

                    const scoreA = winA ? winnerScore : loserScore;
                    const scoreB = winA ? loserScore : winnerScore;
                    const winnerId = winA ? m.participantAId : m.participantBId;

                    return {
                        ...m,
                        scoreA,
                        scoreB,
                        winnerId,
                        isCompleted: true
                    };
                }
                return m;
            });

            updateWithHistory({ ...tournament, matches: newMatches });
        }
    );
  };

  const handleClearRR1 = () => {
    openConfirm(
        "Reset Stage 1 Results?",
        "This will reset all scores in Stage 1 to unplayed. All current progress in this stage will be lost.",
        () => {
            const newMatches = tournament.matches.map(m => {
                if (m.stage === StageType.RR1) {
                    return {
                        ...m,
                        scoreA: null,
                        scoreB: null,
                        winnerId: null,
                        isCompleted: false
                    };
                }
                return m;
            });
            updateWithHistory({ ...tournament, matches: newMatches });
        }
    );
  };

  return (
    <div className="bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
             <div className="flex items-center gap-3">
                <button 
                    onClick={() => navigate('/')}
                    className="text-slate-400 hover:text-white hover:bg-slate-700 p-2 rounded-full transition-colors"
                    title="Back to Dashboard"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
                    <p className="text-sm text-slate-400">{tournament.title}</p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                {history.length > 0 && (
                    <button
                        onClick={handleUndo}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded text-sm flex items-center gap-2 border border-slate-600"
                        title="Undo last action"
                    >
                        ↩ Undo
                    </button>
                )}
                {isRR1Complete && !hasStep2 && (
                    <button 
                        onClick={handleStartStep2}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-bold shadow-lg shadow-emerald-900/20 animate-pulse"
                    >
                        Start Stage 2
                    </button>
                )}
                <button 
                  onClick={() => navigator.share ? navigator.share({ title: tournament.title, url: window.location.href }) : alert("URL copied!")}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded text-sm"
                >
                  Share
                </button>
             </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 text-sm font-medium overflow-x-auto">
            <button 
                onClick={() => setActiveTab('standings')}
                className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'standings' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
                Global Standings
            </button>
            <button 
                onClick={() => setActiveTab('matches-rr1')}
                className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'matches-rr1' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
                Round Robin Matches
            </button>
            {hasStep2 && (
                <button 
                    onClick={() => setActiveTab('matches-step2')}
                    className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'matches-step2' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                >
                    {tournament.eliminationType === 'SINGLE_ELIMINATION' ? 'Bracket' : 'Stage 2 Matches'}
                </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'standings' && (
            <Standings 
                participants={standings} 
                qualificationCount={tournament.qualificationCount}
                onReplaceParticipant={handleReplaceParticipant}
                onUpdateRankManual={handleManualRank}
                allowEdits={hasStep2} // Allow replacements during Step 2
            />
        )}

        {activeTab === 'matches-rr1' && (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-400">Stage 1 Matches</h2>
                    <div className="flex gap-2">
                        {!hasStep2 && (
                             <button
                                 onClick={handleClearRR1}
                                 className="text-xs bg-slate-800 hover:bg-red-900/30 border border-slate-600 hover:border-red-500 text-slate-400 hover:text-red-400 px-3 py-1.5 rounded transition-colors"
                             >
                                 Reset Results
                             </button>
                        )}
                        {!isRR1Complete && (
                            <button 
                                onClick={handleSimulateResults}
                                className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 text-blue-400 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                            >
                                ⚡ Simulate Results
                            </button>
                        )}
                    </div>
                </div>
                <MatchList 
                    matches={tournament.matches.filter(m => m.stage === StageType.RR1)}
                    participants={tournament.participants}
                    onMatchClick={setSelectedMatch}
                />
            </div>
        )}

        {activeTab === 'matches-step2' && (
            <>
                {tournament.eliminationType === EliminationType.SINGLE_ELIMINATION ? (
                    <BracketView 
                        matches={tournament.matches.filter(m => m.stage === StageType.SE)}
                        participants={tournament.participants}
                        onMatchClick={setSelectedMatch}
                    />
                ) : (
                    <MatchList 
                        matches={tournament.matches.filter(m => m.stage !== StageType.RR1)}
                        participants={tournament.participants}
                        onMatchClick={setSelectedMatch}
                    />
                )}
            </>
        )}
      </div>

      {selectedMatch && (
        <MatchModal 
            match={selectedMatch}
            participants={tournament.participants}
            onSave={handleMatchSave}
            onReset={handleMatchReset}
            onClose={() => setSelectedMatch(null)}
        />
      )}

      <ConfirmDialog 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};