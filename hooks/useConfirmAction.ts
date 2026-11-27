import { useCallback, useState } from 'react';

interface PendingConfirm {
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
}

/**
 * Holds one pending destructive action for a screen. Returns `requestConfirm`
 * to open it and the props for `ConfirmActionModal`. Used instead of
 * `Alert.alert`, which does nothing on web.
 */
export function useConfirmAction() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestConfirm = useCallback((title: string, message: string, onConfirm: () => Promise<void>) => {
    setPending({ title, message, onConfirm });
  }, []);

  const close = useCallback(() => {
    if (!isLoading) setPending(null);
  }, [isLoading]);

  const runPending = useCallback(async () => {
    if (!pending) return;
    setIsLoading(true);
    try {
      await pending.onConfirm();
    } finally {
      setIsLoading(false);
      setPending(null);
    }
  }, [pending]);

  return {
    requestConfirm,
    confirmModal: {
      visible: pending !== null,
      title: pending?.title ?? '',
      message: pending?.message ?? '',
      confirmLabel: 'Delete',
      destructive: true,
      isLoading,
      onConfirm: runPending,
      onClose: close,
    },
  };
}
