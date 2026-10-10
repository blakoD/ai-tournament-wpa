import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<Props> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <Modal
      onClose={onCancel}
      size="sm"
      zIndexClassName="z-[60]"
      showCloseButton={false}
      bodyClassName="p-4 sm:p-6"
      footerClassName="bg-slate-50 dark:bg-slate-900/50 sm:justify-end"
      footer={
        <>
            <button
                type="button"
                onClick={onCancel}
                className="flex-1 sm:flex-none px-4 py-2 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition-colors"
            >
                {t('confirmDialog.cancel')}
            </button>
            <button
                type="button"
                onClick={onConfirm}
                className="flex-1 sm:flex-none px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/20 transition-colors"
            >
                {t('confirmDialog.confirm')}
            </button>
        </>
      }
    >
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-600 dark:text-slate-300 text-sm">{message}</p>
    </Modal>
  );
};
