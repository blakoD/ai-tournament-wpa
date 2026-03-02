import React from 'react';
import { Match, Participant } from '../types';

interface Props {
  matches: Match[];
  participants: Participant[];
  onMatchClick: (match: Match) => void;
}

export const MatchList: React.FC<Props> = ({ matches, participants, onMatchClick }) => {
  // Group by Round
  const grouped = matches.reduce((acc, match) => {
    const r = match.round || 1;
    if (!acc[r]) acc[r] = [];
    acc[r].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const getParticipantName = (id: string | null) => {
    if (!id) return "TBD";
    return participants.find(p => p.id === id)?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      {Object.keys(grouped).sort((a,b) => parseInt(a)-parseInt(b)).map(round => (
        <div key={round}>
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 ml-1">Round {round}</h3>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {grouped[parseInt(round)].map(m => {
                const pA = participants.find(p => p.id === m.participantAId);
                const pB = participants.find(p => p.id === m.participantBId);
                const nameA = pA?.name || "TBD";
                const nameB = pB?.name || "TBD";

                return (
                    <div 
                        key={m.id}
                        onClick={() => onMatchClick(m)}
                        className={`
                            relative rounded-lg border p-3 cursor-pointer transition-all
                            ${m.isCompleted 
                                ? 'bg-slate-800 border-slate-700 opacity-80 hover:opacity-100' 
                                : 'bg-slate-800 border-blue-900/30 hover:border-blue-500 shadow-sm hover:shadow-md hover:shadow-blue-900/20'}
                        `}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className={`font-medium truncate max-w-[120px] ${m.winnerId === m.participantAId ? 'text-green-400' : 'text-slate-300'}`}>
                                {nameA}
                            </span>
                            <span className={`font-mono text-lg font-bold ${m.isCompleted ? 'text-white' : 'text-slate-600'}`}>
                                {m.scoreA ?? '-'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className={`font-medium truncate max-w-[120px] ${m.winnerId === m.participantBId ? 'text-green-400' : 'text-slate-300'}`}>
                                {nameB}
                            </span>
                            <span className={`font-mono text-lg font-bold ${m.isCompleted ? 'text-white' : 'text-slate-600'}`}>
                                {m.scoreB ?? '-'}
                            </span>
                        </div>
                        {!m.isCompleted && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        )}
                    </div>
                );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};