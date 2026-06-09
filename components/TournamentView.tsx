import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RiDeleteBinFill } from 'react-icons/ri';
import { Tournament, Match, StageType, TournamentStatus, Participant, EliminationType } from '../types';
import { calculateStandings, startNextStage, generateId } from '../services/tournamentLogic';
import { Standings } from './Standings';
import { MatchList } from './MatchList/MatchList';
import { BracketView } from './BracketView';
import { MatchModal } from './MatchModal';
import { ConfirmDialog } from './ConfirmDialog';
import { NextStageModal } from './NextStageModal';
import { TournamentConfig } from './TournamentConfig';
import { VscClearAll } from 'react-icons/vsc';

interface Props {
  tournament: Tournament;
  readOnly: boolean;
  onUpdate: (t: Tournament) => Promise<Tournament>;
  onMatchResult: (tournamentId: string, matchId: string, scoreA: number, scoreB: number) => Promise<Tournament>;
  onSwapParticipant: (tournamentId: string, matchId: string, slot: 'A' | 'B', newParticipantId: string) => Promise<Tournament>;
}

export const TournamentView: React.FC<Props> = ({ tournament, readOnly, onUpdate, onMatchResult, onSwapParticipant }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>('global-standings');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isNextStageModalOpen, setIsNextStageModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [unlockTapTimestamps, setUnlockTapTimestamps] = useState<number[]>([]);
  const [tournamentReadOnly, setTournamentReadOnly] = useState<boolean>(readOnly);

  // History for Undo functionality
  const [history, setHistory] = useState<Tournament[]>([]);

  // Confirmation Dialog State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

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

  useEffect(() => {
    const storageKey = `tournament_read_only_${tournament.id}`;
    const stored = window.localStorage.getItem(storageKey);

    if (stored === null) {
      setTournamentReadOnly(readOnly);
      return;
    }

    setTournamentReadOnly(stored === 'true');
  }, [tournament.id, readOnly]);

  const canEdit = !tournamentReadOnly;

  const handleTitleTap = () => {
    if (isSaving) {
      return;
    }

    const now = Date.now();
    const recentTaps = [...unlockTapTimestamps, now].filter((timestamp) => now - timestamp <= 5000);

    if (recentTaps.length < 10) {
      setUnlockTapTimestamps(recentTaps);
      return;
    }

    setUnlockTapTimestamps([]);
    const nextReadOnly = !tournamentReadOnly;
    setTournamentReadOnly(nextReadOnly);
    window.localStorage.setItem(`tournament_read_only_${tournament.id}`, String(nextReadOnly));
  };

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
  const updateWithHistory = async (newTournament: Tournament): Promise<Tournament> => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await onUpdate(newTournament);
      setHistory(prev => [...prev, tournament]);
      return updated;
    } catch (updateError) {
      setSaveError(updateError instanceof Error ? updateError.message : 'Failed to save tournament changes.');
      throw updateError;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUndo = async () => {
    if (!canEdit) return;
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setIsSaving(true);
    setSaveError(null);
    try {
      await onUpdate(previous);
      setHistory(prev => prev.slice(0, -1));
    } catch (updateError) {
      setSaveError(updateError instanceof Error ? updateError.message : 'Failed to undo last action.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMatchSave = async (matchId: string, scoreA: number, scoreB: number) => {
    if (!canEdit) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onMatchResult(tournament.id, matchId, scoreA, scoreB);
      setHistory(prev => [...prev, tournament]);
      setSelectedMatch(null);
    } catch (updateError) {
      setSaveError(updateError instanceof Error ? updateError.message : 'Failed to save match result.');
      throw updateError;
    } finally {
      setIsSaving(false);
    }
  };

  const handleMatchReset = () => {
    if (!canEdit) return;
    if (!selectedMatch) return;

    openConfirm(
      t('tournamentView.confirmResetMatchTitle'),
      t('tournamentView.confirmResetMatchMsg'),
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
            newCompletedAt = null;
          }
        }

        void updateWithHistory({
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
    if (!canEdit) return;
    // Updated Global Rank
    tournament.participants = tournament.participants.map(p => ({
      ...p,
      globalRank: standings.find(s => s.id === p.id)?.globalRank
    }));

    const updated = startNextStage(tournament, nextFormat, qualifiedIds, groupAssignments, manualFinals);
    void updateWithHistory(updated);
    setIsNextStageModalOpen(false);

    const lastMatch = updated.matches[updated.matches.length - 1];
    if (lastMatch) {
      setActiveTab(`stage-${lastMatch.stageNumber}`);
    }
  };

  const handleFinalizeTournament = () => {
    if (!canEdit) return;
    if (!isCurrentStageComplete || tournament.status === TournamentStatus.COMPLETED) {
      return;
    }

    openConfirm(
      t('tournamentView.confirmFinalizeTitle'),
      t('tournamentView.confirmFinalizeMsg'),
      () => {
        void updateWithHistory({
          ...tournament,
          status: TournamentStatus.COMPLETED,
          completedAt: Date.now(),
        });
      }
    );
  };

  const handleReplaceParticipant = (oldId: string, newName: string) => {
    if (!canEdit) return;
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

    void updateWithHistory({ ...tournament, participants: newParticipants, matches: newMatches });
  };

  const handleSimulateResults = () => {
    if (!canEdit) return;
    const currentTabStageNumber = activeTab.startsWith('stage-') ? parseInt(activeTab.split('-')[1]) : currentStageNumber;
    const stageMatches = tournament.matches.filter(m => m.stageNumber === currentTabStageNumber);
    const stageType = stageMatches[0]?.stage || StageType.RR;

    openConfirm(
      t('tournamentView.confirmSimulateTitle'),
      t('tournamentView.confirmSimulateMsg', { type: stageType === StageType.RR ? t('tournamentView.roundRobin') : t('tournamentView.bracket') }),
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

        void updateWithHistory({
          ...tournament,
          matches: newMatches
        });
      }
    );
  };

  const handleReorderMatches = (reorderedMatches: Match[]) => {
    if (!canEdit) return;
    const updatedById = new Map(reorderedMatches.map(m => [m.id, m]));
    const newMatches = tournament.matches.map(m => updatedById.get(m.id) ?? m);
    void updateWithHistory({ ...tournament, matches: newMatches });
  };

  const handleParticipantSwap = async (matchId: string, slot: 'A' | 'B', newParticipantId: string) => {
    if (!canEdit) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSwapParticipant(tournament.id, matchId, slot, newParticipantId);
      setHistory(prev => [...prev, tournament]);
    } catch (updateError) {
      setSaveError(updateError instanceof Error ? updateError.message : 'Failed to swap participant.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveStage = (stageNum: number) => {
    if (!canEdit) return;
    const stageMatches = tournament.matches.filter(m => m.stageNumber === stageNum);
    const stageType = stageMatches[0]?.stage;
    const label = stageType === StageType.SE ? t('tournamentView.bracket') : t('tournamentView.stage', { number: stageNum });

    openConfirm(
      t('tournamentView.confirmRemoveTitle', { label }),
      t('tournamentView.confirmRemoveMsg', { label }),
      () => {
        const newMatches = tournament.matches.filter(m => m.stageNumber !== stageNum);
        let newStatus = tournament.status;
        let newCompletedAt = tournament.completedAt;
        if (newStatus === TournamentStatus.COMPLETED) {
          newStatus = TournamentStatus.STARTED;
          newCompletedAt = null;
        }
        const prevStageNum = stageNum - 1;
        void updateWithHistory({ ...tournament, matches: newMatches, status: newStatus, completedAt: newCompletedAt });
        setActiveTab(prevStageNum >= 1 ? `stage-${prevStageNum}` : 'global-standings');
      }
    );
  };

  const handleClearStage = (stageNum: number) => {
    if (!canEdit) return;
    openConfirm(
      t('tournamentView.confirmResetStageTitle', { number: stageNum }),
      t('tournamentView.confirmResetStageMsg', { number: stageNum }),
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
        void updateWithHistory({ ...tournament, matches: newMatches });
      }
    );
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-full transition-colors"
                title={t('tournamentView.backToDashboard')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2 mt-0.5">
                  <h1
                    onClick={handleTitleTap}
                    className="text-2xl font-bold text-slate-900 dark:text-white cursor-pointer select-none"
                    title="Tournament"
                  >
                    {tournament.name}
                  </h1>
                  {tournament.completedAt && (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100/20 dark:bg-emerald-900/30 border border-emerald-700/50 px-2 py-0.5 rounded mb-[-3px]">
                      {t('tournamentView.completed')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{tournament.title}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{!tournamentReadOnly && t('tournamentView.editModeEnabled')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSaving && <span className="text-xs text-blue-400">{t('tournamentView.saving')}</span>}
              {canEdit && history.length > 0 && (
                <button
                  onClick={handleUndo}
                  disabled={isSaving}
                  className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded text-sm flex items-center gap-2 border border-slate-300 dark:border-slate-600"
                  title="Undo last action"
                >
                  <span className="">↺</span>
                </button>
              )}
              {canEdit && isCurrentStageComplete && !isFinalStage && tournament.status !== TournamentStatus.COMPLETED && (
                <button
                  onClick={() => setIsNextStageModalOpen(true)}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-bold shadow-lg shadow-emerald-900/20 animate-pulse"
                >
                  {t('tournamentView.nextStage')}
                </button>
              )}
              {canEdit && isCurrentStageComplete && tournament.status !== TournamentStatus.COMPLETED && (
                <button
                  onClick={handleFinalizeTournament}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold shadow-lg shadow-blue-900/20"
                >
                  {t('tournamentView.finalizeTournament')}
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab('config')}
              className={`pb-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'config' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              {t('tournamentView.configTab')}
            </button>
            <button
              onClick={() => setActiveTab('global-standings')}
              className={`pb-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'global-standings' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              {t('tournamentView.globalStandingsTab')}
            </button>
            {Array.from(new Set(tournament.matches.map(m => m.stageNumber))).sort((a, b) => a - b).map(stageNum => {
              const stageMatches = tournament.matches.filter(m => m.stageNumber === stageNum);
              const stageType = stageMatches[0]?.stage;
              const label = stageType === StageType.SE ? t('tournamentView.bracket') : t('tournamentView.stage', { number: stageNum });
              return (
                <button
                  key={stageNum}
                  onClick={() => setActiveTab(`stage-${stageNum}`)}
                  className={`pb-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === `stage-${stageNum}` ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
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
        {saveError && (
          <div className="mb-4 rounded border border-red-700/60 bg-red-700/20 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-200">{saveError}</div>
        )}

        {activeTab === 'config' && (
          <TournamentConfig
            tournament={tournament}
            readOnly={!canEdit}
            onUpdate={updateWithHistory}
          />
        )}

        {activeTab === 'global-standings' && (
          <Standings
            participants={standings}
            qualifiesByGroup={undefined}
            onReplaceParticipant={handleReplaceParticipant}
            allowEdits={canEdit && hasStep2}
            mode="global"
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
                <h2 className="text-lg font-bold text-slate-500 dark:text-slate-400">
                  {stageType === StageType.SE ? "" : t('tournamentView.stageMatches', { number: stageNum })}
                </h2>
                <div className="flex gap-2">
                  {canEdit && isLastStage && !isCurrentStageComplete && (
                    <button
                      onClick={handleSimulateResults}
                      title="Simulate random results"
                      className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                    >
                      ⚡ 
                    </button>
                  )}
                  {canEdit && isLastStage && (
                    <button
                      onClick={() => handleClearStage(stageNum)}
                      title="Reset all match results in this stage"
                      className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 border border-slate-300 dark:border-slate-600 hover:border-red-400 dark:hover:border-red-500 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-3 py-1.5 rounded transition-colors"
                    >
                      <VscClearAll />
                    </button>
                  )}
                  {canEdit && isLastStage && stageNum > 1 && (
                    <button
                      onClick={() => handleRemoveStage(stageNum)}
                      title="Remove this stage and all its matches"
                      className="text-xs dark:bg-red-900/20 hover:bg-red-50 border border-red-700/50 hover:border-red-500 text-red-400 hover:text-red-300 px-3 py-1.5 rounded transition-colors"
                    >
                      <RiDeleteBinFill />
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
                  readOnly={!canEdit}
                />
              ) : (
                <MatchList
                  matches={stageMatches}
                  participants={tournament.participants}
                  onMatchClick={setSelectedMatch}
                  onReorderMatches={canEdit ? handleReorderMatches : undefined}
                  readOnly={!canEdit}
                  maxScore={tournament.maxScore ?? 16}
                />
              )}

              {stageType === StageType.RR && (
                <div className="mt-12 border-t dark:border-slate-800 pt-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-500 dark:text-white">{t('tournamentView.stageStandings')}</h3>
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{t('tournamentView.stage', { number: stageNum })}</span>
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
                    allowEdits={canEdit && isLastStage && hasStep2}
                  />
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {selectedMatch && canEdit && (
        <MatchModal
          match={selectedMatch}
          participants={tournament.participants}
          maxScore={tournament.maxScore ?? 16}
          onSave={handleMatchSave}
          onReset={handleMatchReset}
          onClose={() => setSelectedMatch(null)}
          isSaving={isSaving}
        />
      )}

      {isNextStageModalOpen && canEdit && (
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