import React from 'react';
import { Match, Participant } from '../types';

interface Props {
  matches: Match[];
  participants: Participant[];
  onMatchClick: (match: Match) => void;
}

export const BracketView: React.FC<Props> = ({ matches, participants, onMatchClick }) => {
  // Group by Round
  const roundsMap: Record<number, Match[]> = {};
  let maxRound = 0;

  matches.forEach(m => {
      const r = m.round;
      if (r > maxRound) maxRound = r;
      if (!roundsMap[r]) roundsMap[r] = [];
      roundsMap[r].push(m);
  });

  // Sort matches in rounds to ensure alignment? 
  // The generation logic pushes them in traversal order (Top->Bottom), so simple mapping should work.
  
  const rounds = [];
  for (let i = 1; i <= maxRound; i++) {
      rounds.push(roundsMap[i] || []);
  }

  const getParticipantName = (id: string | null) => {
      if (!id) return "TBD";
      return participants.find(p => p.id === id)?.name || "Unknown";
  };

  return (
    <div className="overflow-x-auto pb-8">
      <div className="flex gap-12 min-w-max px-4 py-8">
          {rounds.map((roundMatches, rIndex) => (
              <div key={rIndex} className="flex flex-col justify-around relative">
                  {/* Round Label */}
                  <div className="absolute -top-8 left-0 w-full text-center font-bold text-slate-500 uppercase text-sm">
                      {rIndex === rounds.length - 1 ? 'Final' : (rIndex === rounds.length - 2 ? 'Semi-Finals' : `Round ${rIndex + 1}`)}
                  </div>

                  {roundMatches.map(m => {
                      const pA = participants.find(p => p.id === m.participantAId);
                      const pB = participants.find(p => p.id === m.participantBId);
                      
                      return (
                          <div key={m.id} className="relative flex items-center my-4">
                              {/* Match Card */}
                              <div 
                                  onClick={() => onMatchClick(m)}
                                  className={`
                                      w-48 rounded-lg border text-sm cursor-pointer shadow-sm transition-all z-10 relative
                                      ${m.isCompleted 
                                          ? 'bg-slate-800 border-slate-600 hover:border-slate-500' 
                                          : 'bg-slate-900 border-blue-900/50 hover:border-blue-500 hover:shadow-blue-900/20'}
                                  `}
                              >
                                  <div className={`px-3 py-2 border-b border-slate-700/50 flex justify-between ${m.winnerId === m.participantAId ? 'bg-emerald-900/20 text-emerald-400 font-bold' : 'text-slate-300'}`}>
                                      <span className="truncate">{pA?.name || 'TBD'}</span>
                                      <span className="ml-2 font-mono">{m.scoreA ?? '-'}</span>
                                  </div>
                                  <div className={`px-3 py-2 flex justify-between ${m.winnerId === m.participantBId ? 'bg-emerald-900/20 text-emerald-400 font-bold' : 'text-slate-300'}`}>
                                      <span className="truncate">{pB?.name || 'TBD'}</span>
                                      <span className="ml-2 font-mono">{m.scoreB ?? '-'}</span>
                                  </div>
                              </div>

                              {/* Connector Lines */}
                              {/* If not final round, draw line to right */}
                              {rIndex < rounds.length - 1 && (
                                  <div className="absolute -right-6 w-6 h-px bg-slate-600 top-1/2" />
                              )}
                              
                              {/* Tree Vertical connectors are tricky with pure CSS flex justify-around 
                                  because we don't know exact heights. 
                                  However, simple 'arms' usually suffice for a visual.
                              */}
                          </div>
                      );
                  })}
              </div>
          ))}
      </div>
    </div>
  );
};