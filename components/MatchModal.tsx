import React, { useState, useEffect } from 'react';
import { ImPlus, ImMinus } from "react-icons/im";
import { useTranslation } from 'react-i18next';
import { Match, Participant } from '../types';

interface Props {
  match: Match;
  participants: Participant[];
  maxScore?: number;
  onSave: (matchId: string, scoreA: number, scoreB: number) => void;
  onReset?: () => void;
  onClose: () => void;
  isSaving?: boolean;
}

export const MatchModal: React.FC<Props> = ({ match, participants, maxScore = 16, onSave, onReset, onClose, isSaving }) => {
  const { t } = useTranslation();
  const [sA, setSA] = useState<string>(match.scoreA?.toString() || '');
  const [sB, setSB] = useState<string>(match.scoreB?.toString() || '');
  const [fullscreen, setFullscreen] = useState(false);

  const [error, setError] = useState('');
  const [showLowScoreWarning, setShowLowScoreWarning] = useState(false);

  const pA = participants.find(p => p.id === match.participantAId);
  const pB = participants.find(p => p.id === match.participantBId);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const parseScore = (val: string) => {
    const n = parseInt(val);
    return isNaN(n) ? 0 : n;
  };

  const adjustScore = (side: 'A' | 'B', delta: number) => {
    if (side === 'A') {
      setSA(prev => String(Math.max(0, parseScore(prev) + delta)));
    } else {
      setSB(prev => String(Math.max(0, parseScore(prev) + delta)));
    }
    setShowLowScoreWarning(false);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const scoreA = parseInt(sA);
    const scoreB = parseInt(sB);

    if (isNaN(scoreA) || isNaN(scoreB)) {
      setError(t('matchModal.errorInvalidScores'));
      return;
    }

    if (scoreA === scoreB) {
      setError(t('matchModal.errorDraws'));
      return;
    }

    if (!showLowScoreWarning && scoreA < maxScore && scoreB < maxScore) {
      setShowLowScoreWarning(true);
      return;
    }

    onSave(match.id, scoreA, scoreB);
  };

  if (!pA || !pB) return null;

  const overlayClass = fullscreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-black animate-in fade-in duration-200'
    : 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200';

  const cardClass = fullscreen
    ? 'bg-white dark:bg-slate-800 w-full h-full flex flex-col overflow-hidden'
    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden';

  const btnSize = fullscreen ? 'w-16 h-16 text-3xl' : 'w-10 h-10 text-md';
  const inputSize = fullscreen ? 'w-36 h-32 text-7xl' : 'w-20 h-16 text-3xl';

  const ScoreControl = ({
    side,
    value,
    onChange,
    autoFocus,
  }: {
    side: 'A' | 'B';
    value: string;
    onChange: (v: string) => void;
    autoFocus?: boolean;
  }) => (
    <div className="flex flex-col items-center gap-3">
        <input
            type="number"
            autoFocus={autoFocus}
            min="0"
            className={inputSize + ' text-center font-bold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:border-blue-500 outline-none text-slate-900 dark:text-white'}
            value={value}
            onChange={e => {
            onChange(e.target.value);
            setShowLowScoreWarning(false);
            setError('');
            }}
        />
        <div className="flex gap-2">
            <button
                type="button"
                onClick={() => adjustScore(side, 1)}
                className={btnSize + ' rounded-md bg-[#296421] hover:bg-[#3a7a2a] active:scale-95 border border-slate-600 text-white font-bold transition-all select-none'}
            >
                <div className="flex items-center justify-center">
                    <ImPlus />
                </div>
            </button>
            <button
                type="button"
                onClick={() => adjustScore(side, -1)}
                className={btnSize + ' rounded-md bg-[#d52525] hover:bg-[#ff4c4c] active:scale-95 border border-slate-600 text-white font-bold transition-all select-none'}
            >
                <div className="flex items-center justify-center">
                    <ImMinus />
                </div>
            </button>
        </div>
    </div>
  );

  return (
    <div className={overlayClass}>
      <div className={cardClass}>
        <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h3 className={'font-bold text-slate-900 dark:text-white ' + (fullscreen ? 'text-xl' : 'text-lg')}>{t('matchModal.title')}</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFullscreen(f => !f)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded transition-colors"
              title={fullscreen ? t('matchModal.exitFullscreen') : t('matchModal.fullscreen')}
            >
              {fullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M15 9h4.5M15 9V4.5M9 15H4.5M9 15v4.5M15 15h4.5M15 15v4.5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              )}
            </button>
            <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">✕</button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className={'flex flex-col flex-1 ' + (fullscreen ? 'p-8 gap-6' : 'p-6')}
        >
            <div className={'flex flex-col ' + (fullscreen ? 'flex-1 justify-center' : '')}>
                <div className={'flex justify-between items-center gap-4 ' + (fullscreen ? 'mb-12' : 'mb-2')}>
                    <div className="flex-1 text-center">
                        <div className={'font-bold text-blue-400 ' + (fullscreen ? 'text-3xl' : 'text-xl')}>{pA.name}</div>
                    </div>
                    <div className={'text-slate-500 font-bold ' + (fullscreen ? 'text-md' : 'text-xs')}>{t('matchModal.vs')}</div>
                    <div className="flex-1 text-center">
                        <div className={'font-bold text-red-400 ' + (fullscreen ? 'text-3xl' : 'text-xl')}>{pB.name}</div>
                    </div>
                </div>
                <div className={'flex justify-between items-center gap-4 ' + (fullscreen ? 'mb-4' : 'mb-8 mt-4')}>
                    <div className="flex-1 flex justify-center">
                        <ScoreControl side="A" value={sA} onChange={setSA} autoFocus />
                    </div>
                    <div 
                        className={'text-slate-700 font-bold ' + (fullscreen ? 'text-5xl mt-8' : 'text-2xl mt-3')} 
                        style={{ alignSelf: 'baseline' }}>
                            -
                    </div>
                    <div className="flex-1 flex justify-center">
                        <ScoreControl side="B" value={sB} onChange={setSB} />
                    </div>
                </div>
            </div>
            <div className="mt-auto">
                {error && (
                    <div className="mb-4 p-3 bg-red-200/50 dark:bg-red-900/50 border border-red-700 text-red-600 dark:text-red-200 text-sm text-center rounded">
                      {error}
                    </div>
                )}

                {showLowScoreWarning && (
                    <div className="mb-4 p-3 bg-amber-900/50 border border-amber-700 text-amber-200 text-sm text-center rounded animate-pulse">
                    <strong>{t('matchModal.warningTitle')}</strong> {t('matchModal.warningBody', { max: maxScore })}<br />
                      {t('matchModal.warningConfirm')}
                    </div>
                )}

                {!showLowScoreWarning && !error && (
                    <div className={'text-slate-500 text-center ' + (fullscreen ? 'text-base mb-4' : 'text-xs mb-6')}>
                      {t('matchModal.rule', { max: maxScore })}
                    </div>
                )}

                <div className="flex gap-3">
                    {match.isCompleted && onReset && (
                    <button
                        type="button"
                        onClick={onReset}
                        className={'px-4 rounded-lg bg-red-200/50 dark:bg-red-900/20 text-red-400 font-bold hover:bg-red-900/40 border border-red-900/50 transition-colors ' + (fullscreen ? 'py-5 text-lg' : 'py-3')}
                        title={t('matchModal.resetTitle')}
                    >
                        {t('matchModal.reset')}
                    </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className={'flex-1 rounded-lg bg-slate-700 text-slate-300 font-bold hover:bg-slate-600 transition-colors ' + (fullscreen ? 'py-5 text-lg' : 'py-3')}
                    >
                      {t('matchModal.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className={'flex-1 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-colors ' + (fullscreen ? 'py-5 text-lg' : 'py-3')}
                    >
                      {isSaving 
                        ? t('matchModal.saving') 
                        : showLowScoreWarning ? t('matchModal.confirmSave') : t('matchModal.saveResult')
                      }
                    </button>
                </div>
            </div>
        </form>
      </div>
    </div>
  );
};
