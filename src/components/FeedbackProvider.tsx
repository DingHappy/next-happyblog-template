'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
}

interface ConfirmState {
  title: string;
  message: string;
  confirmText: string;
  variant: 'danger' | 'primary';
  resolve: (value: boolean) => void;
}

interface FeedbackContextValue {
  toast: (text: string, type?: ToastType) => void;
  confirm: (options: {
    title?: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'primary';
  }) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const toastIdRef = useRef(0);

  const toast: FeedbackContextValue['toast'] = (text, type = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((current) => [...current, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 2800);
  };

  const confirm: FeedbackContextValue['confirm'] = ({
    title = '确认操作',
    message,
    confirmText = '确认',
    variant = 'danger',
  }) =>
    new Promise<boolean>((resolve) => {
      setConfirmState({ title, message, confirmText, variant, resolve });
    });

  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="fixed right-5 top-5 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur ${
              item.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/90 dark:text-green-300'
                : item.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/90 dark:text-red-300'
                  : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/90 dark:text-blue-300'
            }`}
          >
            {item.text}
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{confirmState.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{confirmState.message}</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => closeConfirm(false)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => closeConfirm(true)}
                className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition-colors ${
                  confirmState.variant === 'danger'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useToast() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useToast must be used within FeedbackProvider');
  }
  return context.toast;
}

export function useConfirm() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useConfirm must be used within FeedbackProvider');
  }
  return context.confirm;
}
