import React, { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<Props> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if(e.key === 'Escape' && isOpen) onCancel();
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-800 border border-slate-600 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden scale-100">
        <div className="p-6">
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-300 text-sm">{message}</p>
        </div>
        <div className="bg-slate-900/50 p-4 flex justify-end gap-3 border-t border-slate-700">
            <button 
                onClick={onCancel}
                className="px-4 py-2 rounded text-slate-400 hover:text-white font-medium transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={onConfirm}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/20 transition-colors"
            >
                Confirm
            </button>
        </div>
      </div>
    </div>
  );
};