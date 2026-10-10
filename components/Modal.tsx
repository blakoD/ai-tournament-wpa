import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

const sizeClasses: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
};

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  /** Secondary header line, hidden on mobile. */
  subtitle?: React.ReactNode;
  /** Extra buttons rendered in the header, before the close button. */
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  /** Full viewport on phones, regular dialog from `sm` up. */
  fullScreenOnMobile?: boolean;
  /** Full viewport on every screen size. */
  fullScreen?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  zIndexClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

/** Duration of the exit animation (keep in sync with `.modal-*-out` in index.html). */
const EXIT_MS = 180;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const Modal: React.FC<ModalProps> = ({
  onClose,
  children,
  title,
  subtitle,
  headerActions,
  footer,
  size = 'md',
  fullScreenOnMobile = false,
  fullScreen = false,
  closeOnEscape = true,
  closeOnBackdrop = true,
  showCloseButton = true,
  zIndexClassName = 'z-50',
  headerClassName = '',
  titleClassName = 'text-lg',
  bodyClassName = 'p-4',
  footerClassName = '',
}) => {
  const { t } = useTranslation();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Only close on backdrop click when the press also started on the backdrop
  // (avoids closing when a text selection drag ends outside the panel).
  const pressStartedOnBackdrop = useRef(false);

  // Play the exit animation before handing control back to the parent.
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    if (prefersReducedMotion()) {
      onCloseRef.current();
      return;
    }
    closingRef.current = true;
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      onCloseRef.current();
      // If the parent keeps the modal mounted, allow it to be closed again.
      closingRef.current = false;
      setClosing(false);
    }, EXIT_MS);
  }, []);

  useEffect(() => {
    if (!closeOnEscape) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEscape, requestClose]);

  const overlayClass = fullScreen
    ? 'items-center justify-center p-0 bg-black'
    : 'items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm';

  let panelClass: string;
  if (fullScreen) {
    panelClass = 'h-[100dvh] max-h-[100dvh] rounded-none border-0';
  } else if (fullScreenOnMobile) {
    panelClass = `h-[100dvh] max-h-[100dvh] rounded-none sm:h-auto sm:max-h-[90dvh] sm:rounded-xl border-0 sm:border ${sizeClasses[size]}`;
  } else {
    panelClass = `max-h-[92dvh] sm:max-h-[90dvh] rounded-t-2xl sm:rounded-xl border-0 sm:border ${sizeClasses[size]}`;
  }

  const hasHeader = title !== undefined || headerActions !== undefined;

  const closeButton = showCloseButton && (
    <button
      type="button"
      onClick={requestClose}
      aria-label={t('common.close')}
      title={t('common.close')}
      className="p-2 -m-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );

  return (
    <div
      className={`fixed inset-0 ${zIndexClassName} flex ${overlayClass} ${closing ? 'modal-overlay-out pointer-events-none' : 'modal-overlay-in'}`}
      onMouseDown={e => { pressStartedOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={e => {
        if (closeOnBackdrop && pressStartedOnBackdrop.current && e.target === e.currentTarget) requestClose();
        pressStartedOnBackdrop.current = false;
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl flex flex-col overflow-hidden ${panelClass} ${closing ? 'modal-panel-out' : 'modal-panel-in'}`}
      >
        {hasHeader ? (
          <div className={`shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 ${headerClassName}`}>
            <div className="min-w-0">
              {title !== undefined && (
                <h2 className={`font-bold text-slate-900 dark:text-white truncate ${titleClassName}`}>{title}</h2>
              )}
              {subtitle && (
                <p className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {headerActions}
              {closeButton}
            </div>
          </div>
        ) : (
          showCloseButton && <div className="absolute top-3 right-3 z-10">{closeButton}</div>
        )}

        <div className={`flex-1 min-h-0 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>

        {footer && (
          <div className={`shrink-0 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 border-t border-slate-200 dark:border-slate-700 flex gap-2 sm:gap-3 ${footerClassName}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
