"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { useI18n } from "@/features/i18n/I18nProvider";

interface Toast {
  id: string;
  message: string;
  variant: "error";
}

interface ToastContextValue {
  showError: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  const { t } = useI18n();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showError = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) {
        return;
      }

      const id = `toast-${nextId.current}`;
      nextId.current += 1;
      setToasts((current) => [...current.slice(-3), { id, message: trimmed, variant: "error" }]);
      const timer = window.setTimeout(() => dismiss(id), 6500);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of activeTimers.values()) {
        window.clearTimeout(timer);
      }
      activeTimers.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ showError }), [showError]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="assertive" aria-relevant="additions text">
        {toasts.map((toast) => (
          <div className={`toast ${toast.variant}`} role="alert" key={toast.id}>
            <AlertCircle size={20} aria-hidden="true" />
            <div className="toast-copy">
              <strong>{t("errorToastTitle")}</strong>
              <span>{toast.message}</span>
            </div>
            <button className="toast-close" type="button" onClick={() => dismiss(toast.id)} aria-label={t("dismissToast")}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToasts(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToasts must be used inside ToastProvider.");
  }
  return context;
}

export function useErrorToast(error: string): void {
  const { showError } = useToasts();

  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);
}
