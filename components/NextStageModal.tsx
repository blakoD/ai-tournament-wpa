import React, { useState, useMemo } from 'react';
import { Participant, EliminationType, Match, StageType } from '../types';
import { calculateStandings } from '../services/tournamentLogic';

interface Props {
  participants: Participant[];
  matches: Match[];
  onConfirm: (nextFormat: EliminationType, qualifiedIds: string[], groupAssignments?: Record<string, string>, manualFinals?: Record<string, string>) => void;
  onClose: () => void;
  qualifiesByGroup: number;
  currentStage: StageType;
  currentStageNumber: number;
}

export const NextStageModal: React.FC<Props> = ({ participants, matches, onConfirm, onClose, qualifiesByGroup, currentStage, currentStageNumber }) => {
  const [nextFormat, setNextFormat] = useState<EliminationType>(EliminationType.SINGLE_ELIMINATION);
  
  const isRR = currentStage === StageType.RR;

  // Filter participants to only those who were in the current (just finished) stage
  const participantsInCurrentStage = useMemo(() => {
    const stageMatches = matches.filter(m => m.stage === currentStage && m.stageNumber === currentStageNumber);
    const ids = new Set<string>();
    stageMatches.forEach(m => {
      if (m.participantAId) ids.add(m.participantAId);
      if (m.participantBId) ids.add(m.participantBId);
    });
    // If no matches found for stage (shouldn't happen if modal is open), fallback to all
    if (ids.size === 0) return participants;
    return participants.filter(p => ids.has(p.id));
  }, [participants, matches, currentStage, currentStageNumber]);

  // Calculate standings to get current performance for the specific stage
  const standings = useMemo(() => {
    return calculateStandings(participantsInCurrentStage, matches, currentStage, currentStageNumber);
  }, [participantsInCurrentStage, matches, currentStage, currentStageNumber]);

  // Initial qualified based on group ranks
  const initialQualifiedIds = useMemo(() => {
    return standings.filter(p => p.rank <= qualifiesByGroup).map(p => p.id);
  }, [standings, qualifiesByGroup]);

  const [selectedIds, setSelectedIds] = useState<string[]>(initialQualifiedIds);
  const [groupCount, setGroupCount] = useState(1);
  const [groupAssignments, setGroupAssignments] = useState<Record<string, string>>({});
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  const [isManualFinals, setIsManualFinals] = useState(false);
  const [finalAssignments, setFinalAssignments] = useState<Record<string, string>>({});

  // Initialize group assignments when selectedIds or groupCount changes
  React.useEffect(() => {
    const newAssignments: Record<string, string> = { ...groupAssignments };
    const groupNames = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i)); // A, B, C...
    
    selectedIds.forEach((id, index) => {
      if (!newAssignments[id] || !groupNames.includes(newAssignments[id])) {
        // Distribute evenly by default
        newAssignments[id] = groupNames[index % groupCount];
      }
    });
    
    // Clean up assignments for unselected IDs
    Object.keys(newAssignments).forEach(id => {
      if (!selectedIds.includes(id)) {
        delete newAssignments[id];
      }
    });

    setGroupAssignments(newAssignments);
  }, [selectedIds, groupCount]);

  // Reset final assignments when manual mode is disabled or selection changes
  React.useEffect(() => {
    if (!isManualFinals) {
      setFinalAssignments({});
    } else {
       // Clean up assignments for unselected IDs
       const newAssignments = { ...finalAssignments };
       let changed = false;
       Object.keys(newAssignments).forEach(id => {
         if (!selectedIds.includes(id)) {
           delete newAssignments[id];
           changed = true;
         }
       });
       if (changed) setFinalAssignments(newAssignments);
    }
  }, [isManualFinals, selectedIds]);

  const toggleParticipant = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const isBracket = nextFormat === EliminationType.SINGLE_ELIMINATION;
  const canShowManualFinals = isBracket && selectedIds.length >= 2 && selectedIds.length <= 4;
  
  // If manual finals is not possible/enabled, ensure it's off
  React.useEffect(() => {
      if (!canShowManualFinals && isManualFinals) {
          setIsManualFinals(false);
      }
  }, [canShowManualFinals, isManualFinals]);

  const isValidCount = !isBracket || (selectedIds.length > 0 && selectedIds.length % 2 === 0);
  
  let canConfirm = selectedIds.length >= 2 && isValidCount;

  if (isManualFinals && isBracket) {
      const finalCount = Object.values(finalAssignments).filter(v => v === 'Final').length;
      const thirdCount = Object.values(finalAssignments).filter(v => v === '3rd vs 4th').length;
      
      const validFinal = finalCount === 2;
      const validThird = thirdCount === 0 || thirdCount === 2;
      canConfirm = validFinal && validThird;
  }

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(nextFormat, selectedIds, nextFormat === EliminationType.ROUND_ROBIN_2 ? groupAssignments : undefined, isManualFinals ? finalAssignments : undefined);
  };

  // Calculate standings to get current performance for the specific stage
  // We re-calculate here to respect the showAllParticipants toggle
  const displayedStandings = useMemo(() => {
    const source = showAllParticipants ? participants : participantsInCurrentStage;
    return calculateStandings(source, matches, currentStage, currentStageNumber);
  }, [participants, participantsInCurrentStage, showAllParticipants, matches, currentStage, currentStageNumber]);

  // Order by wins, points in favor, points against (already done by calculateStandings sortFn)
  const sortedStandings = [...displayedStandings].sort((a, b) => (a.globalRank || 999) - (b.globalRank || 999));
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">Setup Next Stage</h2>
          <p className="text-slate-400 text-sm">Configure the format and select participants for the next step.</p>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Next Format</label>
            <select 
              className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-blue-500 outline-none"
              value={nextFormat}
              onChange={e => setNextFormat(e.target.value as EliminationType)}
            >
              <option value={EliminationType.SINGLE_ELIMINATION}>Bracket</option>
              <option value={EliminationType.ROUND_ROBIN_2}>Round-Robin</option>
            </select>
          </div>

          {nextFormat === EliminationType.ROUND_ROBIN_2 && selectedIds.length >= 2 && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-medium text-slate-400 mb-2">Number of Groups</label>
              <select 
                className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:border-blue-500 outline-none"
                value={groupCount}
                onChange={e => setGroupCount(parseInt(e.target.value))}
              >
                {Array.from({ length: Math.floor(selectedIds.length / 2) }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>{num} {num === 1 ? 'Group' : 'Groups'}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-slate-400">Select Qualified Participants</label>
              <div className="flex items-center gap-4">
                {canShowManualFinals && (
                    <div className="flex items-center gap-2">
                        <input 
                        type="checkbox" 
                        id="manualFinals" 
                        checked={isManualFinals} 
                        onChange={(e) => setIsManualFinals(e.target.checked)}
                        className="rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="manualFinals" className="text-xs text-slate-400 cursor-pointer select-none">
                          Finals
                        </label>
                    </div>
                )}
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="showAll" 
                    checked={showAllParticipants} 
                    onChange={(e) => setShowAllParticipants(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="showAll" className="text-xs text-slate-400 cursor-pointer select-none">
                    Show All Participants
                  </label>
                </div>
              </div>
            </div>
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-900 text-slate-500 uppercase text-xs font-bold">
                  <tr>
                    <th className="px-4 py-2 w-10"></th>
                    <th className="px-4 py-2 w-12 text-center">Rank</th>
                    <th className="px-4 py-2">Player</th>
                    <th className="px-4 py-2 text-center">Wins</th>
                    <th className="px-4 py-2 text-center">Diff</th>
                    {isRR && <th className="px-4 py-2 text-center">Prev Group</th>}
                    {isRR && <th className="px-4 py-2 w-12 text-center">Pos</th>}
                    {nextFormat === EliminationType.ROUND_ROBIN_2 && groupCount > 1 && (
                      <th className="px-4 py-2 text-center">Next Group</th>
                    )}
                    {isManualFinals && (
                        <th className="px-4 py-2 text-center">Match</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {sortedStandings.map((p) => {
                    const isSelected = selectedIds.includes(p.id);
                    return (
                      <tr 
                        key={p.id} 
                        className={`hover:bg-slate-700/30 cursor-pointer transition-colors ${isSelected ? 'bg-blue-900/20' : ''}`}
                        onClick={() => toggleParticipant(p.id)}
                      >
                        <td className="px-4 py-3">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-slate-900 border-slate-600'}`}>
                            {isSelected && <span className="text-white text-xs">✓</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-slate-400">
                            #{p.globalRank}
                        </td>
                        <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                        <td className="px-4 py-3 text-center text-emerald-400 font-bold">{p.wins}</td>
                        <td className="px-4 py-3 text-center text-slate-400">{p.pointsFor - p.pointsAgainst}</td>
                        {isRR && (
                          <td className="px-4 py-3 text-center">
                            <span className="text-[10px] font-bold bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded border border-slate-700">
                              {p.group}
                            </span>
                          </td>
                        )}
                        {isRR && (
                          <td className="px-4 py-3 text-center font-mono text-slate-400">
                            {p.rank}
                          </td>
                        )}
                        {nextFormat === EliminationType.ROUND_ROBIN_2 && groupCount > 1 && (
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {isSelected ? (
                              <select 
                                className="bg-slate-900 border border-slate-700 rounded text-xs text-white p-1 outline-none focus:border-blue-500"
                                value={groupAssignments[p.id] || 'A'}
                                onChange={(e) => setGroupAssignments(prev => ({ ...prev, [p.id]: e.target.value }))}
                              >
                                {Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i)).map(g => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-slate-600 text-xs">-</span>
                            )}
                          </td>
                        )}
                        {isManualFinals && (
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                {isSelected ? (
                                    <select 
                                        className="bg-slate-900 border border-slate-700 rounded text-xs text-white p-1 outline-none focus:border-blue-500"
                                        value={finalAssignments[p.id] || ''}
                                        onChange={(e) => setFinalAssignments(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    >
                                        <option value="">-</option>
                                        <option value="Final">Final</option>
                                        <option value="3rd vs 4th">3rd vs 4th</option>
                                    </select>
                                ) : (
                                    <span className="text-slate-600 text-xs">-</span>
                                )}
                            </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Selected: {selectedIds.length} players. 
              {nextFormat === EliminationType.SINGLE_ELIMINATION && !isManualFinals && selectedIds.length % 2 !== 0 && (
                <span className="text-amber-500 ml-2">Bracket requires an even number of players.</span>
              )}
              {isManualFinals && (
                  <span className="ml-2">
                      Final: {Object.values(finalAssignments).filter(v => v === 'Final').length}/2. 
                      3rd vs 4th: {Object.values(finalAssignments).filter(v => v === '3rd vs 4th').length}/2.
                  </span>
              )}
            </p>
          </div>
        </div>


        <div className="p-6 border-t border-slate-700 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 py-3 font-bold rounded shadow-lg transition-colors ${
              canConfirm 
                ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20' 
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            Confirm Next Stage
          </button>
        </div>
      </div>
    </div>
  );
};
