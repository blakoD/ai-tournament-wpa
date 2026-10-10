import React, { useState, useRef } from 'react';
import { ImPlus, ImMinus } from "react-icons/im";
import { useTranslation } from 'react-i18next';
import { Match, Participant } from '../types';
import { Modal } from './Modal';

interface Props {
  match: Match;
  participants: Participant[];
  maxScore?: number;
  onSave: (matchId: string, scoreA: number, scoreB: number, signal: AbortSignal) => Promise<void>;
  onReset?: () => void;
  onClose: () => void;
  isSaving?: boolean;
}

interface ScoreControlProps {
  value: string;
  fullscreen: boolean;
  autoFocus?: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  onAdjust: (delta: number) => void;
}

// Defined outside MatchModal so the input keeps its identity (and focus / mobile keyboard) across re-renders.
const ScoreControl: React.FC<ScoreControlProps> = ({ value, fullscreen, autoFocus, onChange, onBlur, onAdjust }) => {
  const btnSize = fullscreen ? 'w-16 h-16 text-3xl' : 'w-12 h-12 text-md';
  const inputSize = fullscreen ? 'w-28 h-24 text-6xl sm:w-36 sm:h-32 sm:text-7xl' : 'w-20 h-16 text-3xl';

  return (
    <div className="flex flex-col items-center gap-3">
        <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            autoFocus={autoFocus}
            min="0"
            className={inputSize + ' text-center font-bold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:border-blue-500 outline-none text-slate-900 dark:text-white'}
            value={value}
            onChange={e => onChange(e.target.value)}
            onBlur={onBlur}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => onAdjust(1)}
            className={btnSize + ' rounded-md bg-[#296421] hover:bg-[#3a7a2a] active:scale-95 border border-slate-600 text-white font-bold transition-all select-none'}
          >
            <div className="flex items-center justify-center">
              <ImPlus />
            </div>
          </button>
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => onAdjust(-1)}
            className={btnSize + ' rounded-md bg-[#d52525] hover:bg-[#ff4c4c] active:scale-95 border border-slate-600 text-white font-bold transition-all select-none'}
          >
            <div className="flex items-center justify-center">
              <ImMinus />
            </div>
          </button>
        </div>
    </div>
  );
};

export const MatchModal: React.FC<Props> = ({ match, participants, maxScore = 16, onSave, onReset, onClose }) => {
  const { t } = useTranslation();
  const [sA, setSA] = useState<string>(match.scoreA?.toString() || '');
  const [sB, setSB] = useState<string>(match.scoreB?.toString() || '');
  const [fullscreen, setFullscreen] = useState(false);

  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialScoreA = useRef(match.scoreA);
  const initialScoreB = useRef(match.scoreB);

  const pA = participants.find(p => p.id === match.participantAId);
  const pB = participants.find(p => p.id === match.participantBId);

  const parseScore = (val: string) => {
    const n = parseInt(val);
    return isNaN(n) ? 0 : n;
  };

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSave = (newSA: string, newSB: string) => {
    const scoreA = parseInt(newSA);
    const scoreB = parseInt(newSB);
    if (isNaN(scoreA) || isNaN(scoreB)) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (savedTimer.current) clearTimeout(savedTimer.current);
    setIsSaving(true);
    setSavedRecently(false);

    onSave(match.id, scoreA, scoreB, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) {
          setIsSaving(false);
          setSavedRecently(true);
          savedTimer.current = setTimeout(() => setSavedRecently(false), 2000);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setIsSaving(false);
          setError(err instanceof Error ? err.message : 'Failed to save');
        }
      });
  };

  const scheduleSave = (newSA: string, newSB: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => triggerSave(newSA, newSB), 600);
  };

  const flushSave = (newSA: string, newSB: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    triggerSave(newSA, newSB);
  };

  const adjustScore = (side: 'A' | 'B', delta: number) => {
    let newSA = sA;
    let newSB = sB;
    if (side === 'A') {
      newSA = String(Math.max(0, parseScore(sA) + delta));
      setSA(newSA);
    } else {
      newSB = String(Math.max(0, parseScore(sB) + delta));
      setSB(newSB);
    }
    setError('');
    scheduleSave(newSA, newSB);
  };

  const handleScoreInput = (side: 'A' | 'B', v: string) => {
    if (side === 'A') setSA(v);
    else setSB(v);
    setError('');
    scheduleSave(
      side === 'A' ? v : sA,
      side === 'B' ? v : sB
    );
  };

  const handleReset = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const origA = initialScoreA.current;
    const origB = initialScoreB.current;
    if (origA !== null && origA !== undefined && origB !== null && origB !== undefined) {
      const a = origA.toString();
      const b = origB.toString();
      setSA(a);
      setSB(b);
      triggerSave(a, b);
    } else {
      onReset?.();
    }
  };

  if (!pA || !pB) return null;

  const isDirty = sA !== (initialScoreA.current?.toString() ?? '') || sB !== (initialScoreB.current?.toString() ?? '');

  const fullscreenToggle = (
    <button
      type="button"
      onClick={() => setFullscreen(f => !f)}
      className="p-2 -m-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      title={fullscreen ? t('matchModal.exitFullscreen') : t('matchModal.fullscreen')}
      aria-label={fullscreen ? t('matchModal.exitFullscreen') : t('matchModal.fullscreen')}
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
  );

  const statusClass = fullscreen ? 'text-base mb-4' : 'text-xs mb-2';

  return (
    <Modal
      onClose={onClose}
      size="md"
      fullScreen={fullscreen}
      title={t('matchModal.title')}
      titleClassName={fullscreen ? 'text-xl' : 'text-lg'}
      headerClassName="bg-slate-50 dark:bg-slate-900"
      headerActions={fullscreenToggle}
      bodyClassName={'flex flex-col ' + (fullscreen ? 'p-4 sm:p-8 gap-6' : 'p-4')}
    >
            <div className={'flex flex-col ' + (fullscreen ? 'flex-1 justify-center' : '')}>
                <div className={'flex justify-between items-center gap-2 sm:gap-4 ' + (fullscreen ? 'mb-6 sm:mb-12' : 'mb-2')}>
                    <div className="flex-1 min-w-0 text-center">
                        <div className={'font-bold text-slate-900 dark:text-white break-words ' + (fullscreen ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl')}>{pA.name}</div>
                    </div>
                    <div className={'text-slate-500 font-bold shrink-0 ' + (fullscreen ? 'text-md' : 'text-xs')}>{t('matchModal.vs')}</div>
                    <div className="flex-1 min-w-0 text-center">
                        <div className={'font-bold text-slate-900 dark:text-white break-words ' + (fullscreen ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl')}>{pB.name}</div>
                    </div>
                </div>
                <div className={'flex justify-between items-center gap-2 sm:gap-4 ' + (fullscreen ? 'mb-4' : 'mb-4 mt-2')}>
                    <div className="flex-1 flex justify-center">
                        <ScoreControl
                          value={sA}
                          fullscreen={fullscreen}
                          onChange={v => handleScoreInput('A', v)}
                          onBlur={() => flushSave(sA, sB)}
                          onAdjust={delta => adjustScore('A', delta)}
                        />
                    </div>
                    <div
                        className={'text-slate-700 font-bold ' + (fullscreen ? 'text-5xl mt-8' : 'text-2xl mt-3')}
                        style={{ alignSelf: 'baseline' }}>
                            -
                    </div>
                    <div className="flex-1 flex justify-center">
                        <ScoreControl
                          value={sB}
                          fullscreen={fullscreen}
                          onChange={v => handleScoreInput('B', v)}
                          onBlur={() => flushSave(sA, sB)}
                          onAdjust={delta => adjustScore('B', delta)}
                        />
                    </div>
                </div>
                {isDirty && (
                    <div className="flex justify-center mb-2">
                        <button
                          type="button"
                          onClick={handleReset}
                          className="px-3 py-1.5 rounded text-sm text-slate-500 dark:text-slate-400 underline underline-offset-2 hover:text-slate-900 dark:hover:text-white transition-colors"
                          title={t('matchModal.resetTitle')}
                        >
                          {t('matchModal.reset')}
                        </button>
                    </div>
                )}
            </div>
            <div className="mt-auto">
                {error && (
                    <div className="mb-4 p-3 bg-red-200/50 dark:bg-red-900/50 border border-red-700 text-red-600 dark:text-red-200 text-sm text-center rounded">
                      {error}
                    </div>
                )}

                {isSaving && (
                    <div className={'text-slate-400 text-center ' + statusClass}>
                      {t('matchModal.saving')}
                    </div>
                )}
                {savedRecently && !isSaving && (
                    <div className={'text-green-400 text-center ' + statusClass}>
                      {t('matchModal.saved')}
                    </div>
                )}
                {!isSaving && !savedRecently && !error && (
                    <div className={'text-slate-500 text-center ' + statusClass}>
                      {t('matchModal.rule', { max: maxScore })}
                    </div>
                )}
            </div>
    </Modal>
  );
};
