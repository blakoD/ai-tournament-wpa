import React from 'react';
import { useTranslation } from 'react-i18next';
import { Match, Participant } from '../types';

interface Props {
  /** Matches of a single-elimination stage. */
  matches: Match[];
  participants: Participant[];
}

type Place = 1 | 2 | 3;

const placeStyles: Record<Place, { medal: string; block: string; ring: string; height: string; labelKey: string; delay: string }> = {
  1: {
    medal: '🥇',
    block: 'bg-gradient-to-b from-amber-300 to-yellow-500 text-amber-900',
    ring: 'ring-amber-300/70 dark:ring-amber-400/40',
    height: 'h-24 sm:h-36',
    labelKey: 'podium.first',
    delay: '150ms',
  },
  2: {
    medal: '🥈',
    block: 'bg-gradient-to-b from-slate-200 to-slate-400 text-slate-700',
    ring: 'ring-slate-300/70 dark:ring-slate-400/40',
    height: 'h-16 sm:h-24',
    labelKey: 'podium.second',
    delay: '0ms',
  },
  3: {
    medal: '🥉',
    block: 'bg-gradient-to-b from-orange-300 to-amber-700 text-orange-950',
    ring: 'ring-orange-300/70 dark:ring-orange-400/40',
    height: 'h-12 sm:h-16',
    labelKey: 'podium.third',
    delay: '300ms',
  },
};

const isFinalMatch = (m: Match) => m.isFinal || m.label === 'Final';
const isThirdPlaceMatch = (m: Match) => m.label === '3rd vs 4th';

const loserOf = (m: Match) =>
  m.winnerId === m.participantAId ? m.participantBId : m.participantAId;

export const Podium: React.FC<Props> = ({ matches, participants }) => {
  const { t } = useTranslation();

  const final = matches.find(isFinalMatch);
  if (!final || !final.isCompleted || !final.winnerId) return null;

  const byId = (id: string | null | undefined) => (id ? participants.find(p => p.id === id) : undefined);

  const first = byId(final.winnerId);
  const second = byId(loserOf(final));
  const thirdMatch = matches.find(isThirdPlaceMatch);
  const third = thirdMatch?.isCompleted && thirdMatch.winnerId ? byId(thirdMatch.winnerId) : undefined;

  if (!first) return null;

  // Classic podium order: 2nd, 1st, 3rd.
  const entries: { place: Place; participant: Participant }[] = [];
  if (second) entries.push({ place: 2, participant: second });
  entries.push({ place: 1, participant: first });
  if (third) entries.push({ place: 3, participant: third });

  const gridCols = entries.length === 3 ? 'grid-cols-3' : entries.length === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <section
      aria-label={t('podium.title')}
      className="mt-6 sm:mt-10 max-w-2xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm px-3 pt-4 sm:px-8 sm:pt-6 overflow-hidden"
    >
      <h3 className="text-center text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-4 sm:mb-6 flex items-center justify-center gap-2">
        <span aria-hidden="true">🏆</span>
        {t('podium.title')}
      </h3>

      <ol className={`grid ${gridCols} items-end gap-2 sm:gap-4 max-w-xl mx-auto`}>
        {entries.map(({ place, participant }) => {
          const style = placeStyles[place];
          return (
            <li
              key={place}
              className="podium-rise flex flex-col items-center min-w-0"
              style={{ animationDelay: style.delay }}
            >
              <span
                aria-hidden="true"
                className={`leading-none mb-1 ${place === 1 ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'}`}
              >
                {style.medal}
              </span>
              <span
                className={`w-full text-center font-bold text-slate-900 dark:text-white break-words line-clamp-2 leading-tight ${place === 1 ? 'text-sm sm:text-lg' : 'text-xs sm:text-base'}`}
                title={participant.name}
              >
                {participant.name}
              </span>
              <span className="mt-0.5 mb-2 text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t(style.labelKey)}
              </span>
              <div
                className={`w-full ${style.height} ${style.block} rounded-t-xl ring-1 ring-inset ${style.ring} shadow-inner flex items-start justify-center pt-2 sm:pt-3`}
              >
                <span className="text-2xl sm:text-4xl font-black opacity-80 drop-shadow-sm">{place}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
