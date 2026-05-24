'use client';

import { createContext, useContext, useEffect } from 'react';
import { useToast, type Toast as ToastType } from '@/hooks/useToast';
import { IoCheckmarkCircle, IoClose, IoCloseCircle, IoInformationCircle, IoWarning } from 'react-icons/io5';
import { IconButton } from '@/components/ui';

const ToastContext = createContext<ReturnType<typeof useToast> | null>(null);

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex flex-col items-stretch sm:items-end gap-2 pointer-events-none">
        {toast.toasts.map((toastItem) => (
          <ToastItem key={toastItem.id} toast={toastItem} onClose={() => toast.removeToast(toastItem.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastType; onClose: () => void }) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onClose]);

  const toastStyleMap: Record<string, { border: string; icon: string }> = {
    success: {
      border: 'border-l-success',
      icon: 'text-success',
    },
    error: {
      border: 'border-l-danger',
      icon: 'text-danger',
    },
    warning: {
      border: 'border-l-warning',
      icon: 'text-warning',
    },
    info: {
      border: 'border-l-spot',
      icon: 'text-spot',
    },
  };

  const styles = toastStyleMap[toast.type] ?? toastStyleMap.info;

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <IoCheckmarkCircle className="w-5 h-5" />;
      case 'error':
        return <IoCloseCircle className="w-5 h-5" />;
      case 'warning':
        return <IoWarning className="w-5 h-5" />;
      default:
        return <IoInformationCircle className="w-5 h-5" />;
    }
  };

  return (
    <div
      className={`w-full sm:w-auto sm:min-w-[300px] sm:max-w-[420px] rounded-lg border border-edge border-l-4 bg-surface shadow-card px-4 py-3 flex items-start gap-3 pointer-events-auto animate-in slide-in-from-bottom-2 sm:slide-in-from-right-4 fade-in duration-200 ${styles.border}`}
      role="alert"
    >
      <div className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>{getIcon()}</div>
      <div className="flex-1 text-sm font-medium leading-relaxed text-ink">{toast.message}</div>
      <IconButton
        onClick={onClose}
        variant="ghost"
        size="sm"
        className="flex-shrink-0 text-ink-muted hover:text-ink !min-h-0 !min-w-0 !p-0"
        aria-label="閉じる"
      >
        <IoClose className="w-4 h-4" />
      </IconButton>
    </div>
  );
}
