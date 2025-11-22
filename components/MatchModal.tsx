import React, { useState, useEffect } from 'react';
import { Match, Participant } from '../types';

interface Props {
  match: Match;
  participants: Participant[];
  onSave: (matchId: string, scoreA: number, scoreB: number) => void;
  onReset?: () => void;
  onClose: () => void;
}

export const MatchModal: React.FC<Props> = ({ match, participants, onSave, onReset, onClose }) => {
  const [sA, setSA] = useState<string>(match.scoreA?.toString() || '');
  const [sB, setSB] = useState<string>(match.scoreB?.toString() || '');
  
  // Validation states
  const [error, setError] = useState('');
  const [showLowScoreWarning, setShowLowScoreWarning] = useState(false);

  const pA = participants.find(p => p.id === match.participantAId);
  const pB = participants.find(p => p.id === match.participantBId);

  // Close on Esc
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if(e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const scoreA = parseInt(sA);
    const scoreB = parseInt(sB);

    if (isNaN(scoreA) || isNaN(scoreB)) {
        setError("Please enter valid numbers for both scores.");
        return;
    }
    
    // Rule check: No ties
    if (scoreA === scoreB) {
        setError("Draws are not allowed. One player must win.");
        return;
    }

    // Rule check: First to 16 (Optional warning)
    // If warning is not yet shown, check for low scores
    if (!showLowScoreWarning && scoreA < 16 && scoreB < 16) {
        setShowLowScoreWarning(true);
        return; // Stop here, let React render the warning, next click will bypass this
    }

    onSave(match.id, scoreA, scoreB);
  };

  if (!pA || !pB) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-800 border border-slate-600 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-4 flex justify-between items-center border-b border-slate-700">
            <h3 className="text-lg font-bold text-white">Update Score</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
            <div className="flex justify-between items-center gap-4 mb-8">
                <div className="flex-1 text-center">
                    <div className="text-xl font-bold text-blue-400 mb-2 text-wrap truncate">{pA.name}</div>
                    <input 
                        type="number" 
                        autoFocus
                        min="0"
                        className="w-20 h-16 text-center text-3xl font-bold bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 outline-none text-white"
                        value={sA}
                        onChange={e => { setSA(e.target.value); setShowLowScoreWarning(false); setError(''); }}
                    />
                </div>
                <div className="text-slate-500 font-bold text-xl">VS</div>
                <div className="flex-1 text-center">
                    <div className="text-xl font-bold text-red-400 mb-2 text-wrap truncate">{pB.name}</div>
                     <input 
                        type="number" 
                        min="0"
                        className="w-20 h-16 text-center text-3xl font-bold bg-slate-900 border border-slate-600 rounded-lg focus:border-blue-500 outline-none text-white"
                        value={sB}
                        onChange={e => { setSB(e.target.value); setShowLowScoreWarning(false); setError(''); }}
                    />
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-200 text-sm text-center rounded">
                    {error}
                </div>
            )}

            {showLowScoreWarning && (
                <div className="mb-4 p-3 bg-amber-900/50 border border-amber-700 text-amber-200 text-sm text-center rounded animate-pulse">
                    <strong>Warning:</strong> Neither player reached 16 points.<br/>
                    Click <strong>Save Result</strong> again to confirm this score.
                </div>
            )}

            {!showLowScoreWarning && !error && (
                <div className="text-xs text-slate-500 text-center mb-6">
                    Rule: First to 16 points wins. No ties allowed.
                </div>
            )}

            <div className="flex gap-3">
                {match.isCompleted && onReset && (
                    <button 
                        type="button"
                        onClick={onReset}
                        className="px-4 py-3 rounded-lg bg-red-900/20 text-red-400 font-bold hover:bg-red-900/40 border border-red-900/50 transition-colors"
                        title="Reset Match Result"
                    >
                        Reset
                    </button>
                )}
                <button type="button" onClick={onClose} className="flex-1 py-3 rounded-lg bg-slate-700 text-slate-300 font-bold hover:bg-slate-600 transition-colors">
                    Cancel
                </button>
                <button type="submit" className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-colors">
                    {showLowScoreWarning ? 'Confirm & Save' : 'Save Result'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};