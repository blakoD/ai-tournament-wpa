import React, { useState } from 'react';
import { Match, Participant } from '../types';

interface Props {
  matches: Match[];
  participants: Participant[];
  onMatchClick: (match: Match) => void;
  onParticipantSwap?: (matchId: string, slot: 'A' | 'B', newParticipantId: string) => void;
}

export const BracketView: React.FC<Props> = ({ matches, participants, onMatchClick, onParticipantSwap }) => {
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
    <div className="overflow-x-auto min-h-[400px]">
      <div className="flex gap-12 justify-center min-w-max px-4 py-8">
          {rounds.map((roundMatches, rIndex) => {
              const isFinalRound = roundMatches.some(m => m.isFinal);
              return (
                <div key={rIndex} className="flex flex-col justify-around relative">
                    {/* Round Label */}
                    <div className="absolute -top-8 left-0 w-full text-center font-bold text-slate-500 uppercase text-sm">
                        {!isFinalRound && ((rIndex === rounds.length - 2 && roundMatches.length === 2) ? 'Semi-Finals' : `Round ${rIndex + 1}`)}
                    </div>

                    {roundMatches.map(m => {
                        const pA = participants.find(p => p.id === m.participantAId);
                        const pB = participants.find(p => p.id === m.participantBId);
                        
                        const renderParticipant = (slot: 'A' | 'B', p: Participant | undefined, score: number | null) => {
                            const isEditing = editing?.matchId === m.id && editing?.slot === slot;
                            const isWinner = m.winnerId === (slot === 'A' ? m.participantAId : m.participantBId);
                            
                            if (isEditing) {
                                return (
                                    <div className={`px-3 py-2 flex items-center ${slot === 'A' ? 'border-b border-slate-700/50' : ''}`}>
                                        <select
                                            className="w-full bg-slate-800 text-white text-xs p-1 rounded border border-slate-600 outline-none focus:border-blue-500"
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
                                            <option value="">Select Player</option>
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
                                <div className={`px-3 py-2 flex justify-between items-center group/player ${slot === 'A' ? 'border-b border-slate-700/50' : ''} ${isWinner ? 'bg-emerald-900/20 text-emerald-400 font-bold' : 'text-slate-300'}`}>
                                    {p?.globalRank ? (<span className="font-mono text-slate-600 leading-tight pr-2">#{p.globalRank}</span>) : ''}
                                    <span className="flex-1 break-words pr-2 leading-tight flex items-center gap-1">
                                        {p?.name || 'TBD'}
                                        {onParticipantSwap && !m.isCompleted && (
                                            <button
                                                className="opacity-0 group-hover/player:opacity-100 text-slate-500 hover:text-blue-400 transition-opacity px-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditing({ matchId: m.id, slot });
                                                }}
                                                title="Switch Player"
                                            >
                                                ⇄
                                            </button>
                                        )}
                                    </span>
                                    <span className="font-mono shrink-0">{score ?? '-'}</span>
                                </div>
                            );
                        };

                        const positionClass = isFinalRound 
                            ? (m.isFinal ? 'relative mb-9' : 'absolute mt-[350px] w-full') 
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
                                            ${m.isFinal && 'text-[15px] text-yellow-500'}
                                        `}
                                    >
                                        {m.label}
                                    </div>
                                )}

                                {/* Match Card */}
                                <div 
                                    onClick={() => onMatchClick(m)}
                                    className={`
                                        rounded-lg border cursor-pointer shadow-sm transition-all z-10 relative
                                        ${m.isFinal ? 'w-[280px] text-base border-yellow-500' : 'w-[212px] text-sm'}
                                        ${m.isCompleted 
                                            ? 'bg-slate-800 border-slate-600 hover:border-slate-500' 
                                            : 'bg-slate-900 border-blue-900/50 hover:border-blue-500 hover:shadow-blue-900/20'}
                                    `}
                                >
                                    {renderParticipant('A', pA, m.scoreA)}
                                    {renderParticipant('B', pB, m.scoreB)}

                                    {/* Connector Lines */}
                                    {rIndex < rounds.length - 1 && (
                                        <div className="absolute -right-6 w-6 h-px bg-slate-600 top-1/2" />
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