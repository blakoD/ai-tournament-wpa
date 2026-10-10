import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Match, Participant } from '../types';

interface Props {
  matches: Match[];
  participants: Participant[];
  onMatchClick: (match: Match) => void;
  onParticipantSwap?: (matchId: string, slot: 'A' | 'B', newParticipantId: string) => void;
    readOnly?: boolean;
  /** Score needed to win a match; used to detect matches in progress. */
  maxScore?: number;
}

export const BracketView: React.FC<Props> = ({ matches, participants, onMatchClick, onParticipantSwap, readOnly = false, maxScore = 16 }) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<{matchId: string, slot: 'A' | 'B'} | null>(null);
  // Group by Round
  const roundsMap: Record<number, Match[]> = {};
  let maxRound = 0;

  matches.forEach(m => {
      const r = m.round;
      if (r > maxRound) maxRound = r;
      if (!roundsMap[r]) roundsMap[r] = [];
      roundsMap[r].push(m);
  });

  const rounds = [];
  for (let i = 1; i <= maxRound; i++) {
      rounds.push(roundsMap[i] || []);
  }

  return (
    <div className="overflow-x-auto min-h-[400px] snap-x snap-mandatory">
      <div className="flex gap-6 sm:gap-12 justify-center min-w-max px-2 sm:px-4 py-6 sm:py-8">
          {rounds.map((roundMatches, rIndex) => {
              const isFinalRound = roundMatches.some(m => m.isFinal);
              return (
                <div key={rIndex} className="flex flex-col justify-around relative snap-start">
                    {/* Round Label */}
                    <div className="absolute -top-6 sm:-top-8 left-0 w-full text-center font-bold text-slate-400 dark:text-slate-500 uppercase text-sm">
                        {!isFinalRound && ((rIndex === rounds.length - 2 && roundMatches.length === 2) ? t('bracketView.semiFinals') : t('bracketView.round', { number: rIndex + 1 }))}
                    </div>

                    {roundMatches.map(m => {
                        const pA = participants.find(p => p.id === m.participantAId);
                        const pB = participants.find(p => p.id === m.participantBId);
                        
                        const renderParticipant = (slot: 'A' | 'B', p: Participant | undefined, score: number | null) => {
                            const isEditing = editing?.matchId === m.id && editing?.slot === slot;
                            const isWinner = m.winnerId === (slot === 'A' ? m.participantAId : m.participantBId);
                            
                            if (isEditing) {
                                return (
                                    <div className={`px-3 py-2 flex items-center ${slot === 'A' ? 'border-b border-slate-200 dark:border-slate-700/50' : ''}`}>
                                        <select
                                            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs p-1 rounded border border-slate-300 dark:border-slate-600 outline-none focus:border-blue-500"
                                            value={p?.id || ''}
                                            onChange={(e) => {
                                                if (onParticipantSwap && e.target.value) {
                                                    onParticipantSwap(m.id, slot, e.target.value);
                                                }
                                                setEditing(null);
                                            }}
                                            onBlur={() => setEditing(null)}
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="">{t('bracketView.selectPlayer')}</option>
                                            {participants.map(part => (
                                                <option key={part.id} value={part.id}>
                                                    {part.globalRank ? `(#${part.globalRank})  ` : ''}{part.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            }

                            return (
                                <div className={`px-3 py-2 flex justify-between items-center group/player ${slot === 'A' ? 'border-b border-slate-200 dark:border-slate-700/50' : ''} ${isWinner ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-400 dark:text-emerald-400 font-bold' : 'text-slate-700 dark:text-slate-300 font-medium'}`}>
                                    {p?.globalRank ? (<span className="font-mono text-slate-400 dark:text-slate-600 leading-tight pr-2">#{p.globalRank}</span>) : ''}
                                    <span className="flex-1 pr-2 leading-tight flex items-center gap-1">
                                        {p?.name || t('bracketView.tbd')}
                                        {onParticipantSwap && !readOnly && !m.isCompleted && (
                                            <button
                                                className="opacity-100 sm:opacity-0 sm:group-hover/player:opacity-100 text-slate-500 hover:text-blue-400 transition-opacity px-2 py-1 -my-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditing({ matchId: m.id, slot });
                                                }}
                                                title={t('bracketView.switchPlayer')}
                                            >
                                                ⇄
                                            </button>
                                        )}
                                    </span>
                                    <span className="font-mono shrink-0">{score ?? '-'}</span>
                                </div>
                            );
                        };

                        const sA = m.scoreA ?? 0;
                        const sB = m.scoreB ?? 0;
                        const isLive = !m.isCompleted && (sA > 0 || sB > 0) && sA < maxScore && sB < maxScore;

                        const positionClass = isFinalRound 
                            ? (m.isFinal ? 'relative mb-9' : 'relative sm:absolute sm:mt-[350px] sm:w-full')
                            : 'relative';

                        return (
                            <div key={m.id} 
                                 className={`
                                    flex flex-col items-center my-4
                                    ${positionClass}
                                `}
                            >
                                {/* Match Label */}
                                {m.label && (
                                    <div className={`
                                            text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider 
                                            ${m.isFinal ? 'text-[15px] text-yellow-500' : ''}
                                        `}
                                    >
                                        {m.label}
                                    </div>
                                )}

                                {/* Match Card */}
                                <div 
                                    onClick={() => {
                                        if (!readOnly) {
                                            onMatchClick(m);
                                        }
                                    }}
                                    className={`
                                        rounded-lg border shadow-sm transition-all z-10 relative ${readOnly ? 'cursor-default' : 'cursor-pointer'}
                                        ${isLive ? 'live-ring' : ''}
                                        ${m.isFinal ? 'w-[200px] sm:w-[280px] text-base border-2 border-yellow-500' : 'w-[200px] sm:w-[280px] text-sm'}
                                        ${m.isCompleted 
                                            ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500' 
                                            : 'bg-slate-50 dark:bg-slate-900 border-blue-200 dark:border-blue-900/50 hover:border-blue-500 hover:shadow-blue-900/20'}
                                    `}
                                >
                                    {isLive && (
                                        <span className="absolute -top-2.5 right-2 z-20 inline-flex items-center gap-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none text-white shadow-sm">
                                            <span className="h-1.5 w-1.5 rounded-full bg-white motion-safe:animate-pulse" aria-hidden="true" />
                                            {t('common.live')}
                                        </span>
                                    )}
                                    {renderParticipant('A', pA, m.scoreA)}
                                    {renderParticipant('B', pB, m.scoreB)}

                                    {/* Connector Lines */}
                                    {rIndex < rounds.length - 1 && (
                                        <div className="absolute -right-3 w-3 sm:-right-6 sm:w-6 h-px bg-slate-300 dark:bg-slate-600 top-1/2" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
              );
          })}
      </div>
    </div>
  );
};