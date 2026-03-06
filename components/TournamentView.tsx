import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tournament, Match, StageType, TournamentStatus, Participant, EliminationType } from '../types';
import { calculateStandings, startNextStage, generateId } from '../services/tournamentLogic';
import { Standings } from './Standings';
import { MatchList } from './MatchList';
import { BracketView } from './BracketView';
import { MatchModal } from './MatchModal';
import { ConfirmDialog } from './ConfirmDialog';
import { NextStageModal } from './NextStageModal';

interface Props {
  tournament: Tournament;
  onUpdate: (t: Tournament) => void;
}

export const TournamentView: React.FC<Props> = ({ tournament, onUpdate }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('global-standings');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isNextStageModalOpen, setIsNextStageModalOpen] = useState(false);
  
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
    // Show standings for all completed matches in the tournament
    return calculateStandings(tournament.participants, tournament.matches);
  }, [tournament.participants, tournament.matches]);

  // Step 2 matches existence check
  const hasStep2 = tournament.matches.some(m => m.stageNumber > 1);
  
  const currentStage = useMemo(() => {
    const lastMatch = tournament.matches[tournament.matches.length - 1];
    return lastMatch?.stage || StageType.RR;
  }, [tournament.matches]);

  const currentStageNumber = useMemo(() => {
    const lastMatch = tournament.matches[tournament.matches.length - 1];
    return lastMatch?.stageNumber || 1;
  }, [tournament.matches]);

  const isCurrentStageComplete = useMemo(() => {
    return tournament.matches.filter(m => m.stageNumber === currentStageNumber).every(m => m.isCompleted);
  }, [tournament.matches, currentStageNumber]);

  const isFinalStage = useMemo(() => {
    const stageMatches = tournament.matches.filter(m => m.stageNumber === currentStageNumber);
    if (stageMatches.length === 0) return false;
    
    const stageType = stageMatches[0].stage;
    
    if (stageType === StageType.RR) {
      // Round-robin with only 1 group is a final stage
      const participantIds = new Set<string>();
      stageMatches.forEach(m => {
        if (m.participantAId) participantIds.add(m.participantAId);
        if (m.participantBId) participantIds.add(m.participantBId);
      });
      const stageParticipants = tournament.participants.filter(p => participantIds.has(p.id));
      const groups = new Set(stageParticipants.map(p => p.group).filter(Boolean));
      return groups.size <= 1;
    }
    
    if (stageType === StageType.SE) {
      // Bracket with only 1 match is a final stage
      return stageMatches.length === 1;
    }
    
    return false;
  }, [tournament.matches, currentStageNumber]);

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
    let newStatus = tournament.status;
    let newCompletedAt = tournament.completedAt;

    const lastStageMatches = newMatches.filter(m => m.stageNumber === currentStageNumber);
    if (lastStageMatches.length > 0) {
         const allDone = lastStageMatches.every(m => m.isCompleted);
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
            
            const lastStageMatches = newMatches.filter(m => m.stageNumber === currentStageNumber);
            if (lastStageMatches.length > 0) {
                const allDone = lastStageMatches.every(m => m.isCompleted);
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

  const handleNextStage = (nextFormat: EliminationType, qualifiedIds: string[], groupAssignments?: Record<string, string>, manualFinals?: Record<string, string>) => {
    // Updated Global Rank
    tournament.participants = tournament.participants.map(p => ({
        ...p,
        globalRank: standings.find(s => s.id === p.id)?.globalRank
    }));

    const updated = startNextStage(tournament, nextFormat, qualifiedIds, groupAssignments, manualFinals);
    updateWithHistory(updated);
    setIsNextStageModalOpen(false);
    
    const lastMatch = updated.matches[updated.matches.length - 1];
    if (lastMatch) {
        setActiveTab(`stage-${lastMatch.stageNumber}`);
    }
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
    const currentTabStageNumber = activeTab.startsWith('stage-') ? parseInt(activeTab.split('-')[1]) : currentStageNumber;
    const stageMatches = tournament.matches.filter(m => m.stageNumber === currentTabStageNumber);
    const stageType = stageMatches[0]?.stage || StageType.RR;

    openConfirm(
        "Simulate Results?",
        `This will simulate random scores for all remaining ${stageType === StageType.RR ? 'Round Robin' : 'Bracket'} matches in this stage. Existing results will not be changed.`,
        () => {
            let newMatches = tournament.matches.map(m => {
                if (m.stageNumber === currentTabStageNumber && !m.isCompleted && m.participantAId && m.participantBId) {
                    const winA = Math.random() > 0.5;
                    const winnerScore = 16;
                    const loserScore = Math.floor(Math.random() * 15);

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

            // Propagation for Bracket
            if (stageType === StageType.SE) {
                newMatches = newMatches.map(m => {
                    if (m.stage === StageType.SE && m.isCompleted && m.nextMatchId && m.winnerId) {
                        const nextMatch = newMatches.find(nm => nm.id === m.nextMatchId);
                        if (nextMatch) {
                            if (m.nextMatchSlot === 'A') nextMatch.participantAId = m.winnerId;
                            if (m.nextMatchSlot === 'B') nextMatch.participantBId = m.winnerId;
                        }
                    }
                    return m;
                });
            }

            // Check completion
            let newStatus = tournament.status;
            let newCompletedAt = tournament.completedAt;
            const lastStageMatches = newMatches.filter(m => m.stageNumber === currentStageNumber);
            if (lastStageMatches.length > 0) {
                 const allDone = lastStageMatches.every(m => m.isCompleted);
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
        }
    );
  };

    const handleParticipantSwap = (matchId: string, slot: 'A' | 'B', newParticipantId: string) => {
    const targetMatch = tournament.matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    const stageNum = targetMatch.stageNumber;
    const oldParticipantId = slot === 'A' ? targetMatch.participantAId : targetMatch.participantBId;

    // Find if the new participant is already in this stage
    const sourceMatch = tournament.matches.find(m => 
        m.stageNumber === stageNum && 
        (m.participantAId === newParticipantId || m.participantBId === newParticipantId)
    );

    let newMatches = [...tournament.matches];

    if (sourceMatch) {
        // Swap logic
        newMatches = newMatches.map(m => {
            if (m.id === sourceMatch.id) {
                // If it's the same match, we might be swapping A and B
                if (sourceMatch.id === targetMatch.id) {
                    // If we are swapping within the same match
                    return {
                        ...m,
                        participantAId: slot === 'A' ? newParticipantId : oldParticipantId,
                        participantBId: slot === 'B' ? newParticipantId : oldParticipantId
                    };
                }
                // Different matches
                return {
                    ...m,
                    participantAId: m.participantAId === newParticipantId ? oldParticipantId : m.participantAId,
                    participantBId: m.participantBId === newParticipantId ? oldParticipantId : m.participantBId
                };
            }
            if (m.id === targetMatch.id) {
                return {
                    ...m,
                    participantAId: slot === 'A' ? newParticipantId : m.participantAId,
                    participantBId: slot === 'B' ? newParticipantId : m.participantBId
                };
            }
            return m;
        });
    } else {
        // Just replace
        newMatches = newMatches.map(m => {
            if (m.id === targetMatch.id) {
                return {
                    ...m,
                    participantAId: slot === 'A' ? newParticipantId : m.participantAId,
                    participantBId: slot === 'B' ? newParticipantId : m.participantBId
                };
            }
            return m;
        });
    }

    updateWithHistory({ ...tournament, matches: newMatches });
  };

  const handleClearStage = (stageNum: number) => {
    openConfirm(
        `Reset Stage ${stageNum} Results?`,
        `This will reset all scores in Stage ${stageNum} to unplayed. All current progress in this stage will be lost.`,
        () => {
            const stageMatches = tournament.matches.filter(m => m.stageNumber === stageNum);
            const minRound = stageMatches.length > 0 ? Math.min(...stageMatches.map(m => m.round)) : 1;
            const isSE = stageMatches[0]?.stage === StageType.SE;

            const newMatches = tournament.matches.map(m => {
                if (m.stageNumber === stageNum) {
                    const isSubsequentRound = isSE && m.round > minRound;
                    return {
                        ...m,
                        scoreA: null,
                        scoreB: null,
                        winnerId: null,
                        isCompleted: false,
                        participantAId: isSubsequentRound ? null : m.participantAId,
                        participantBId: isSubsequentRound ? null : m.participantBId
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
                        ↩
                    </button>
                )}
                {isCurrentStageComplete && !isFinalStage && (
                    <button 
                        onClick={() => setIsNextStageModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-bold shadow-lg shadow-emerald-900/20 animate-pulse"
                    >
                        Next Stage
                    </button>
                )}
             </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 text-sm font-medium overflow-x-auto">
            <button 
                onClick={() => setActiveTab('global-standings')}
                className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'global-standings' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
                Global Standings
            </button>
            <button 
                onClick={() => setActiveTab('standings')}
                className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'standings' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
            >
                Group Standings
            </button>
            {Array.from(new Set(tournament.matches.map(m => m.stageNumber))).sort((a, b) => a - b).map(stageNum => {
                const stageMatches = tournament.matches.filter(m => m.stageNumber === stageNum);
                const stageType = stageMatches[0]?.stage;
                const label = stageType === StageType.SE ? 'Bracket' : `Stage ${stageNum}`;
                return (
                    <button 
                        key={stageNum}
                        onClick={() => setActiveTab(`stage-${stageNum}`)}
                        className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === `stage-${stageNum}` ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                    >
                        {label}
                    </button>
                );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'global-standings' && (
            <Standings 
                participants={standings} 
                qualifiesByGroup={tournament.qualifiesByGroup}
                onReplaceParticipant={handleReplaceParticipant}
                onUpdateRankManual={handleManualRank}
                allowEdits={hasStep2}
                mode="global"
            />
        )}

        {activeTab === 'standings' && (
            <Standings 
                participants={standings} 
                qualifiesByGroup={tournament.qualifiesByGroup}
                onReplaceParticipant={handleReplaceParticipant}
                onUpdateRankManual={handleManualRank}
                allowEdits={hasStep2} // Allow replacements during Step 2
            />
        )}

        {activeTab.startsWith('stage-') && (() => {
            const stageNum = parseInt(activeTab.split('-')[1]);
            const stageMatches = tournament.matches.filter(m => m.stageNumber === stageNum);
            const stageType = stageMatches[0]?.stage;
            const isLastStage = stageNum === currentStageNumber;

            return (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-slate-400">
                            {stageType === StageType.SE ? 'Bracket' : `Stage ${stageNum} Matches`}
                        </h2>
                        <div className="flex gap-2">
                            {isLastStage && !isCurrentStageComplete && (
                                <button 
                                    onClick={handleSimulateResults}
                                    className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 text-blue-400 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                                >
                                    ⚡ Simulate Results
                                </button>
                            )}
                            {isLastStage && (
                                <button
                                     onClick={() => handleClearStage(stageNum)}
                                     className="text-xs bg-slate-800 hover:bg-red-900/30 border border-slate-600 hover:border-red-500 text-slate-400 hover:text-red-400 px-3 py-1.5 rounded transition-colors"
                                 >
                                     Reset Results
                                 </button>
                            )}
                        </div>
                    </div>
                    {stageType === StageType.SE ? (
                        <BracketView 
                            matches={stageMatches}
                            participants={tournament.participants.map(p => ({
                                ...p,
                                globalRank: standings.find(s => s.id === p.id)?.globalRank
                            }))}
                            onMatchClick={setSelectedMatch}
                            onParticipantSwap={handleParticipantSwap}
                        />
                    ) : (
                        <MatchList 
                            matches={stageMatches}
                            participants={tournament.participants}
                            onMatchClick={setSelectedMatch}
                        />
                    )}

                    {stageType === StageType.RR && (
                        <div className="mt-12 border-t border-slate-800 pt-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white">Stage Standings</h3>
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Stage {stageNum}</span>
                            </div>
                            <Standings 
                                participants={calculateStandings(
                                    tournament.participants.filter(p => 
                                        stageMatches.some(m => m.participantAId === p.id || m.participantBId === p.id)
                                    ),
                                    stageMatches,
                                    stageType,
                                    stageNum
                                )}
                                qualifiesByGroup={tournament.qualifiesByGroup}
                                onReplaceParticipant={handleReplaceParticipant}
                                onUpdateRankManual={handleManualRank}
                                allowEdits={isLastStage && hasStep2}
                            />
                        </div>
                    )}
                </div>
            );
        })()}
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

      {isNextStageModalOpen && (
        <NextStageModal 
            participants={tournament.participants}
            matches={tournament.matches}
            qualifiesByGroup={tournament.qualifiesByGroup}
            currentStage={currentStage}
            currentStageNumber={currentStageNumber}
            onConfirm={handleNextStage}
            onClose={() => setIsNextStageModalOpen(false)}
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